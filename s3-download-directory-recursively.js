#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { fromIni } = require("@aws-sdk/credential-providers");

/**
 * s3-download-directory-recursively.js
 *
 * Recursively download all objects from an S3 prefix into a local directory preserving folder structure.
 *
 * Usage:
 *   node s3-download-directory-recursively.js --bucket my-bucket --prefix some/path/ --dest ./local-dir --region us-east-1 --profile default --concurrency 5
 *
 * Configurable via CLI flags or environment variables (uppercased):
 *   --bucket / BUCKET          (required)
 *   --prefix / PREFIX          (optional, default: "")
 *   --dest / DEST              (default: ./s3-download)
 *   --region / REGION          (optional, default: AWS SDK default)
 *   --profile / PROFILE        (optional, uses shared AWS credentials profile)
 *   --concurrency / CONCURRENCY (optional, default: 5)
 *
 * Install dependencies:
 *   npm install @aws-sdk/client-s3 @aws-sdk/credential-providers
 */

function getArg(name) {
    const idx = process.argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
    return process.env[name.toUpperCase()];
}

function getS3() {
    const REGION = getArg("region") || process.env.AWS_REGION;
    const PROFILE = getArg("profile") || process.env.AWS_PROFILE;
    const s3Config = {};
    if (REGION) s3Config.region = REGION;
    if (PROFILE) s3Config.credentials = fromIni({ profile: PROFILE });
    return new S3Client(s3Config);
}

async function listAllKeys(bucket, prefix, s3Client = getS3()) {
    const keys = [];
    let ContinuationToken;
    do {
        const params = {
            Bucket: bucket,
            Prefix: prefix || undefined,
            ContinuationToken,
        };
        const res = await s3Client.send(new ListObjectsV2Command(params));
        if (res.Contents) {
            for (const obj of res.Contents) {
                // skip "directory markers" (keys that end with '/')
                if (obj.Key && !obj.Key.endsWith("/")) keys.push(obj.Key);
            }
        }
        ContinuationToken = res.IsTruncated
            ? res.NextContinuationToken
            : undefined;
    } while (ContinuationToken);
    return keys;
}

async function ensureDirForFile(filePath) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
}

async function downloadObjectToFile(bucket, key, destFilePath, s3Client = getS3()) {
    const getParams = { Bucket: bucket, Key: key };
    const res = await s3Client.send(new GetObjectCommand(getParams));
    // res.Body is a stream.Readable in Node.js
    await ensureDirForFile(destFilePath);
    const writeStream = fs.createWriteStream(destFilePath);
    await pipeline(res.Body, writeStream);
}

function keyToLocalPath(key, prefix, destRoot) {
    // remove prefix from key to create relative path
    let rel = key;
    if (prefix && key.startsWith(prefix)) rel = key.slice(prefix.length);
    // strip leading slashes
    rel = rel.replace(/^\/*/, "");
    // join parts to produce platform-specific path
    const parts = rel.split("/").filter(Boolean);
    return path.join(destRoot, ...parts);
}

if (require.main === module) {
    (async () => {
        // parse CLI args when running as script
        const BUCKET = getArg("bucket");
        if (!BUCKET) {
            console.error("Error: --bucket (or BUCKET env) is required.");
            process.exit(2);
        }
        const PREFIX = (getArg("prefix") || "").replace(/^\/*/, ""); // remove leading slashes
        const DEST = getArg("dest") || process.env.DEST || "./s3-download";
        const CONCURRENCY = Math.max(
            1,
            parseInt(getArg("concurrency") || process.env.CONCURRENCY || "5", 10),
        );

        const s3 = getS3();

        try {
            console.log(`Listing objects in s3://${BUCKET}/${PREFIX || ""} ...`);
            const keys = await listAllKeys(BUCKET, PREFIX, s3);
            console.log(`Found ${keys.length} files.`);

            if (keys.length === 0) {
                console.log("No files to download.");
                return;
            }

            for (let i = 0; i < keys.length; i += CONCURRENCY) {
                const batch = keys.slice(i, i + CONCURRENCY);
                await Promise.all(
                    batch.map(async (key) => {
                        const localPath = keyToLocalPath(key, PREFIX, DEST);
                        try {
                            await downloadObjectToFile(BUCKET, key, localPath, s3);
                            console.log(`Downloaded: ${key} -> ${localPath}`);
                        } catch (err) {
                            console.error(`Failed: ${key}: ${err.message || err}`);
                            throw err;
                        }
                    }),
                );
            }

            console.log("All downloads completed.");
        } catch (err) {
            console.error("Error:", err);
            process.exit(1);
        }
    })();
}

// Export helpers for testing
module.exports = {
    getArg,
    listAllKeys,
    ensureDirForFile,
    downloadObjectToFile,
    keyToLocalPath,
};

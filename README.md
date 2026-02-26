# s3-recursive-download

Recursively download all objects from an S3 prefix into a local directory while preserving folder structure.

Key features
- Minimal zero-dependency CLI using AWS SDK v3
- Preserve S3 key structure locally
- Supports profiles, region, and concurrency

Install

You can run this from a local checkout or via npx after the package is published to npm.

Local

```bash
npm install
node s3-download-directory-recursively.js --bucket my-bucket --prefix some/path/ --dest ./local-dir --region us-east-1
```

npx

```bash
npx @reciphora/s3-recursive-download --bucket my-bucket --prefix some/path/ --dest ./local-dir --region us-east-1
```

Usage

CLI flags (each also supports environment variables using uppercased names):

- --bucket / BUCKET (required)
- --prefix / PREFIX (optional, default: "")
- --dest / DEST (default: ./s3-download)
- --region / REGION (optional)
- --profile / PROFILE (optional)
- --concurrency / CONCURRENCY (optional, default: 5)

Examples

```bash
# download entire bucket
node s3-download-directory-recursively.js --bucket my-bucket --dest ./backups

# download a prefix with concurrency and profile
node s3-download-directory-recursively.js --bucket my-bucket --prefix path/to/folder/ --dest ./data --concurrency 10 --profile default
```

Contributing

Please open issues and PRs. See `CONTRIBUTING.md` for guidelines (coming soon).

License

This project is licensed under the MIT License - see the `LICENSE` file for details.

Notes

- Before publishing, update the `package.json` fields: `author`, `repository`, and the npx usage to match your npm/org name.
- CI workflows and tests will be added to run on PRs and publish releases.
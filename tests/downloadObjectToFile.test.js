const path = require('path');
const os = require('os');
const fs = require('fs');
const { promises: fsp } = require('fs');
const { Readable } = require('stream');
const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { downloadObjectToFile } = require('../s3-download-directory-recursively');

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

test('downloadObjectToFile writes stream body to file', async () => {
  // prepare a small readable stream as the S3 object body
  const content = 'hello from s3 body';
  const bodyStream = Readable.from([content]);

  s3Mock.on(GetObjectCommand).resolves({ Body: bodyStream });

  // create temporary directory for download
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 's3dl-'));
  const destFile = path.join(tmpDir, 'file.txt');

  try {
    await downloadObjectToFile('my-bucket', 'path/to/file.txt', destFile);

    // verify file exists and contents match
    const downloaded = await fsp.readFile(destFile, 'utf8');
    expect(downloaded).toBe(content);
  } finally {
    // cleanup
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
});

const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { listAllKeys } = require('../s3-download-directory-recursively');

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

test('listAllKeys paginates and filters out directory markers', async () => {
  // First page: contains a file and a directory marker, truncated
  s3Mock
    .on(ListObjectsV2Command)
    .resolvesOnce({
      Contents: [
        { Key: 'prefix/file1.txt' },
        { Key: 'prefix/subdir/' },
      ],
      IsTruncated: true,
      NextContinuationToken: 'tok1',
    })
    .resolvesOnce({
      Contents: [
        { Key: 'prefix/file2.txt' },
      ],
      IsTruncated: false,
    });

  const keys = await listAllKeys('my-bucket', 'prefix/');
  expect(keys).toEqual(['prefix/file1.txt', 'prefix/file2.txt']);
});

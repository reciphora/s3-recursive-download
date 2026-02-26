const path = require('path');
const { keyToLocalPath } = require('../s3-download-directory-recursively');

test('keyToLocalPath removes prefix and constructs local path', () => {
  const key = 'some/path/to/file.txt';
  const prefix = 'some/path/';
  const dest = '/tmp/dest';
  const result = keyToLocalPath(key, prefix, dest);
  expect(result).toBe(path.join(dest, 'to', 'file.txt'));
});

test('keyToLocalPath handles leading slashes and empty prefix', () => {
  const key = '/leading/slash/file.txt';
  const prefix = '';
  const dest = '/tmp/dest2';
  const result = keyToLocalPath(key, prefix, dest);
  expect(result).toBe(path.join(dest, 'leading', 'slash', 'file.txt'));
});

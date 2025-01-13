import { unlink } from 'fs/promises';

export async function removeFile(path) {
  try {
    await unlink(path);
  } catch (e) {
    console.error('Error while unlink file.', e.message);
  }
}

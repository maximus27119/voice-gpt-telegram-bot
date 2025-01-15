import { unlink } from 'fs/promises';

export async function removeFile(path) {
  try {
    await unlink(path);
  } catch (error) {
    console.error('Error while unlink file.', error.message);
  }
}

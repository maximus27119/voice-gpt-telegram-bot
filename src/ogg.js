import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { removeFile } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VOICES_DIR = resolve(__dirname, '../voices');
const DEFAULT_INPUT_OPTIONS = ['-t 30'];

class OggConverter {
  constructor() {
    ffmpeg.setFfmpegPath(installer.path);
  }

  /**
   * Converts audio file to mp3 format.
   * @param {string} input - Input file path.
   * @param {string} output - Output file name (without format).
   * @returns {Promise<string>} MP3 file path.
   */
  async toMP3(input, output) {
    const outputPath = resolve(dirname(input), `${output}.mp3`);
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .inputOptions(DEFAULT_INPUT_OPTIONS)
        .output(outputPath)
        .on('end', () => {
          removeFile(input);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error('Error while converting to MP3:', error.message);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Loads OGG file with URL and saves it locally.
   * @param {string} url - File URL for loading.
   * @param {string} filename - Output file name (without format).
   * @returns {Promise<string>} OGG file path.
   */
  async create(url, filename) {
    const oggPath = resolve(VOICES_DIR, `${filename}.ogg`);
    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        const stream = createWriteStream(oggPath);
        response.data.pipe(stream);
        stream.on('finish', () => resolve(oggPath));
        stream.on('error', (error) => {
          console.error('Error while writing OGG file:', error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error while downloading OGG file:', error.message);
    }
  }
}

export const ogg = new OggConverter();

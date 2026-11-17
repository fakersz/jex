import fs from 'fs';
import path from 'path';

function generateTestWav(filePath) {
  const sampleRate = 44100;
  const duration = 1;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * 2;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log(`Arquivo WAV de teste gerado em: ${filePath} (${buffer.length} bytes)`);
}

generateTestWav(path.resolve(process.cwd(), 'media/music/Musica_Ambiente_JEX.wav'));

import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function requireEnv(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

async function generarDump(rutaSalida) {
  const env = {
    ...process.env,
    PGHOST: requireEnv('DB_HOST'),
    PGPORT: process.env.DB_PORT || '5432',
    PGDATABASE: requireEnv('DB_NAME'),
    PGUSER: requireEnv('DB_USER'),
    PGPASSWORD: requireEnv('DB_PASSWORD'),
  };

  await new Promise((resolve, reject) => {
    const proceso = spawn('pg_dump', ['--no-owner', '--no-privileges'], { env });
    const gzip = createGzip();
    const destino = createWriteStream(rutaSalida);
    let stderr = '';
    proceso.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proceso.on('error', reject);
    pipeline(proceso.stdout, gzip, destino).then(resolve).catch(reject);
    proceso.on('close', (codigo) => {
      if (codigo !== 0) reject(new Error(`pg_dump terminó con código ${codigo}: ${stderr}`));
    });
  });
}

function clienteS3({ endpoint, accessKeyId, secretAccessKey, region }) {
  return new S3Client({
    endpoint,
    region: region || 'auto',
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function subirA(cliente, bucket, nombreArchivo, rutaLocal) {
  await cliente.send(new PutObjectCommand({
    Bucket: bucket,
    Key: nombreArchivo,
    Body: createReadStream(rutaLocal),
  }));
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nombreArchivo = `prestadora-original_backup_${timestamp}.sql.gz`;
  const rutaTemporal = `/tmp/${nombreArchivo}`;

  console.log('Generando dump de la base de datos...');
  await generarDump(rutaTemporal);

  const r2 = clienteS3({
    endpoint: requireEnv('R2_ENDPOINT'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
  });
  console.log('Subiendo a Cloudflare R2 (principal)...');
  await subirA(r2, requireEnv('R2_BUCKET'), nombreArchivo, rutaTemporal);

  const b2 = clienteS3({
    endpoint: `https://${requireEnv('B2_ENDPOINT')}`,
    accessKeyId: requireEnv('B2_KEY_ID'),
    secretAccessKey: requireEnv('B2_APPLICATION_KEY'),
    region: 'us-east-005',
  });
  console.log('Subiendo a Backblaze B2 (espejo)...');
  await subirA(b2, requireEnv('B2_BUCKET'), nombreArchivo, rutaTemporal);

  await unlink(rutaTemporal);
  console.log(`Backup completo: ${nombreArchivo} subido a los dos buckets.`);
}

main().catch((error) => {
  console.error('Error en el backup:', error);
  process.exit(1);
});

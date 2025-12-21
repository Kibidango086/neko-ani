import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req: any, res: any) {
  try {
    const filePath = join(process.cwd(), 'neko-helper.user.js');
    const content = readFileSync(filePath, 'utf-8');

    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(content);
  } catch (error) {
    console.error('Failed to read userscript file:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Could not load userscript file' });
  }
}

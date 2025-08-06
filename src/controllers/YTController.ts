import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const DOWNLOAD_DIR = path.resolve("downloads");
interface YtDlpFormat {
  format_id: string;
  ext: string;
  vcodec: string;
  acodec: string;
  height?: number;
  format_note?: string;
  fps?: number;
  filesize?: number;
}

interface YtDlpOutput {
  formats: YtDlpFormat[];
}
export const YtLinkMeta = async (req: Request, res: Response) => {
  const { links } = req.body;

  const url = 'https://www.youtube.com/watch?v=3gC3MLUePsw';

  // yt-dlp -f 137+bestaudio -o "%(title)s.%(ext)s" "https://www.youtube.com/watch?v=9u84J53l06w"
  // yt-dlp --list-formats "https://www.youtube.com/watch?v=CjU3HuN2wUg" | findstr "video only" 

  let linkMetaArr: any[] = [];
  for (const link of links) {
  try {
    
      const { stdout, stderr } = await execAsync(`yt-dlp -J --no-warnings --quiet "${link}"`);

      if (stderr) {
        console.error("⚠️ yt-dlp error:", stderr);
      }

      const data: YtDlpOutput = JSON.parse(stdout);

      const mp4DashFormats = data.formats.filter((f: YtDlpFormat) =>
        f.ext === "mp4" &&
        f.vcodec !== "none" &&
        f.acodec === "none"
      ).reduce((acc: Record<string | number, YtDlpFormat>, curr) => {
        const key = curr.height || "unknown";
        if (!acc[key] || (curr.filesize || 0) > (acc[key].filesize || 0)) {
          acc[key] = curr; // Keep highest filesize for each resolution
        }
        return acc;
      }, {} as Record<string | number, YtDlpFormat>);

      let linkMetas : any[] = [];
      Object.values(mp4DashFormats).forEach((f: YtDlpFormat) => {
        const sizeInMB = f.filesize ? (f.filesize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown';
        console.log(`🟢 Format ID: ${f.format_id} | Resolution: ${f.height || 'N/A'}p | Note: ${f.format_note} | FPS: ${f.fps || '-'} | Size: ${sizeInMB}`);
        linkMetas.push({
          'formatId': f.format_id,
          'resolution': `${f.height}p`,
          'size': sizeInMB
        })
      });
      linkMetaArr = [...linkMetaArr,linkMetas]
    
    
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('❌ Download failed:', err.message);
    } else {
      console.error('❌ Download failed:', err);
    }
    res.status(500).send('Failed to download video');
  }
}
// const filter = stdOut.split('\n')
res.status(200).json({
  status: true,
  data: linkMetaArr
});
}

export const YtDownload = async (req: Request, res: Response) => {
  const {linkItems} = req.body;
  for (const linkItem of linkItems){
    try {
      const safeFileName = `${Date.now()}_%(title)s.%(ext)s`;
      const command = `yt-dlp -f ${linkItem.formatId}+bestaudio -o "${DOWNLOAD_DIR}/${safeFileName}" ${linkItem.link}`;
      await execAsync(command)     
         // After download, find the real file path by globbing
         const files = fs.readdirSync(DOWNLOAD_DIR);
         const matched = files.find(f => f.includes("_")); // match suffix/type
   
         if (!matched) {
           return res.status(404).json({ error: "Downloaded file not found" });
         }
         const filePath = path.join(DOWNLOAD_DIR, matched);
         return res.download(filePath); // triggers browser download 
    } catch (err:unknown) {
      if (err instanceof Error) {
        console.error('❌ Download failed:', err.message);
      } else {
        console.error('❌ Download failed:', err);
      }
    }
  }
  res.status(500).json({message:"unsuccess"});
}
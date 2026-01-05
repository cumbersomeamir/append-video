import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

async function saveUploadedFile(file: File | Blob, dir: string, filename: string): Promise<string> {
  // Convert File/Blob to Buffer
  let buffer: Buffer;
  if (file instanceof File || file instanceof Blob) {
    const bytes = await file.arrayBuffer();
    buffer = Buffer.from(bytes);
  } else {
    // Fallback: if it's already a Buffer or stream
    throw new Error('Invalid file type');
  }
  
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);
  return filePath;
}

async function appendVideo(inputVideo: string, appendVideo: string, outputVideo: string): Promise<void> {
  // Use Python script for reliable video concatenation
  const pythonScript = join(process.cwd(), 'append_video.py');
  
  try {
    await execFileAsync('python3', [pythonScript, inputVideo, appendVideo, outputVideo], {
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
  } catch (error: any) {
    const errorMessage = error.stderr || error.message || 'Unknown error';
    console.error('Python script error:', errorMessage);
    throw new Error(`Video concatenation failed: ${errorMessage}`);
  }
}


export async function POST(request: NextRequest) {
  const tempDir = join(process.cwd(), 'temp');
  const outputDir = join(process.cwd(), 'output');
  const appendVideoPath = join(process.cwd(), 'cats-driving.mp4');

  try {
    // Create directories if they don't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Check if append video exists
    if (!existsSync(appendVideoPath)) {
      return NextResponse.json(
        { error: 'cats-driving.mp4 not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const fileEntries = formData.getAll('videos');

    if (fileEntries.length === 0) {
      return NextResponse.json(
        { error: 'No videos uploaded' },
        { status: 400 }
      );
    }

    if (fileEntries.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 videos allowed' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const processedVideos: string[] = [];

    // Process each video
    for (let i = 0; i < fileEntries.length; i++) {
      const fileEntry = fileEntries[i];
      
      // Handle both File and Blob types
      if (typeof fileEntry === 'string') {
        console.error(`Invalid file entry at index ${i} - expected File/Blob, got string`);
        continue;
      }
      
      const fileBlob = fileEntry as File | Blob;
      const fileName = fileBlob instanceof File ? fileBlob.name : `video-${i}.mp4`;
      const inputFileName = `${timestamp}-input-${i}-${fileName}`;
      const outputFileName = `${timestamp}-output-${i}-${fileName}`;
      
      const inputPath = join(tempDir, inputFileName);
      const outputPath = join(outputDir, outputFileName);

      try {
        // Save uploaded file
        await saveUploadedFile(fileBlob, tempDir, inputFileName);

        // Use concat demuxer - it's fastest when codecs match
        // If videos have different properties, it may fail, but we'll catch and report the error
        await appendVideo(inputPath, appendVideoPath, outputPath);

        processedVideos.push(outputPath);

        // Clean up input file
        await unlink(inputPath).catch(() => {});
      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        // Clean up on error
        await unlink(inputPath).catch(() => {});
        // Continue with other files
      }
    }

    if (processedVideos.length === 0) {
      return NextResponse.json(
        { error: 'No videos were processed successfully' },
        { status: 500 }
      );
    }

    // Create zip file
    const zip = new AdmZip();
    for (const videoPath of processedVideos) {
      const videoBuffer = await readFile(videoPath);
      const fileName = videoPath.split('/').pop() || 'video.mp4';
      zip.addFile(fileName, videoBuffer);
      
      // Clean up output file
      await unlink(videoPath).catch(() => {});
    }

    const zipBuffer = zip.toBuffer();
    const zipFileName = `processed-videos-${timestamp}.zip`;
    const zipPath = join(outputDir, zipFileName);
    await writeFile(zipPath, zipBuffer);

    // Read zip file and return it
    const zipFile = await readFile(zipPath);
    
    // Clean up zip file after a delay (or let it be cleaned up by a cleanup job)
    setTimeout(() => {
      unlink(zipPath).catch(() => {});
    }, 60000); // Delete after 1 minute

    return new NextResponse(zipFile, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error processing videos:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


# Video Appender

A fast and powerful Next.js application that appends a video file to multiple uploaded videos.

## Features

- ✅ Upload 1-100 videos at once
- ✅ Drag-and-drop interface
- ✅ Append `cats-driving.mp4` to each uploaded video
- ✅ Fast processing using FFmpeg (stream copy when possible, re-encode when needed)
- ✅ Automatic ZIP file generation and download
- ✅ Modern UI with Tailwind CSS
- ✅ Built with Next.js 15.5.9

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure `cats-driving.mp4` is in the root directory (it should already be there)

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Videos**: Drag and drop videos onto the upload area, or click to browse and select files (up to 100 videos)
2. **Process**: Click the "Process Videos" button
3. **Download**: Once processing is complete, click "Download ZIP" to get all processed videos

## How It Works

- Videos are processed server-side using FFmpeg
- The app first tries to use stream copy (fastest - no re-encoding) when videos have compatible codecs
- If stream copy fails (different codecs/resolutions), it falls back to re-encoding with ultrafast preset
- All processed videos are packaged into a ZIP file for download
- Temporary files are automatically cleaned up

## Performance

- Uses FFmpeg's concat demuxer for fastest processing when codecs match
- Falls back to re-encoding with `ultrafast` preset when needed
- Processes videos sequentially to manage server resources
- Automatic cleanup of temporary files

## Project Structure

```
append-video/
├── app/
│   ├── api/
│   │   └── process/
│   │       └── route.ts      # Video processing API
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page component
├── cats-driving.mp4          # Video to append (must be in root)
├── package.json
└── ...
```

## Build for Production

```bash
npm run build
npm start
```

## Technologies

- **Next.js 15.5.9** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **FFmpeg** (via fluent-ffmpeg) - Video processing
- **adm-zip** - ZIP file generation

## Notes

- Maximum file upload size is set to 500MB (can be adjusted in `next.config.ts`)
- Processing time depends on video file sizes and number of videos
- The app creates temporary `temp/` and `output/` directories (auto-cleaned)
- `cats-driving.mp4` must be in the root directory for the app to work

# append-video

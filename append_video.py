#!/usr/bin/env python3
import sys
import subprocess
import os
import tempfile

def append_video(input_video, video_to_append, output_video):
    """
    Append video_to_append to the end of input_video using FFmpeg.
    Normalizes both videos to same format first, then uses concat demuxer with copy for clean concatenation.
    """
    try:
        temp_dir = os.path.dirname(output_video)
        normalized_input = os.path.join(temp_dir, f"norm_input_{os.getpid()}.mp4")
        normalized_append = os.path.join(temp_dir, f"norm_append_{os.getpid()}.mp4")
        
        try:
            # Normalize input video to standard format (match the append video's format or use common format)
            # Use same codec, resolution, and frame rate for both
            cmd_norm1 = [
                'ffmpeg',
                '-i', input_video,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                '-movflags', '+faststart',
                '-r', '30',  # Standardize frame rate to 30fps
                '-s', '1080x1920',  # Standardize resolution (or use input's resolution)
                '-y',
                normalized_input
            ]
            result = subprocess.run(cmd_norm1, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode != 0:
                raise Exception(f"Normalization failed: {result.stderr}")
            
            # Normalize append video (same settings)
            cmd_norm2 = [
                'ffmpeg',
                '-i', video_to_append,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                '-movflags', '+faststart',
                '-r', '30',
                '-s', '1080x1920',
                '-y',
                normalized_append
            ]
            result = subprocess.run(cmd_norm2, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode != 0:
                raise Exception(f"Normalization failed: {result.stderr}")
            
            # Now concat normalized videos with copy (clean concatenation, no glitches)
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                filelist_path = f.name
                norm_input_abs = os.path.abspath(normalized_input)
                norm_append_abs = os.path.abspath(normalized_append)
                norm_input_escaped = norm_input_abs.replace("'", "'\\''")
                norm_append_escaped = norm_append_abs.replace("'", "'\\''")
                f.write(f"file '{norm_input_escaped}'\n")
                f.write(f"file '{norm_append_escaped}'\n")
            
            cmd_concat = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', filelist_path,
                '-c', 'copy',  # Copy streams - clean concatenation
                '-y',
                output_video
            ]
            
            result = subprocess.run(cmd_concat, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            os.unlink(filelist_path)
            
            if result.returncode != 0:
                raise Exception(f"Concat failed: {result.stderr}")
            
            # Cleanup normalized files
            if os.path.exists(normalized_input):
                os.unlink(normalized_input)
            if os.path.exists(normalized_append):
                os.unlink(normalized_append)
            
            print("Success", file=sys.stderr)
            sys.exit(0)
            
        except Exception as e:
            # Cleanup on error
            if os.path.exists(normalized_input):
                os.unlink(normalized_input)
            if os.path.exists(normalized_append):
                os.unlink(normalized_append)
            raise e
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: append_video.py <input_video> <append_video> <output_video>", file=sys.stderr)
        sys.exit(1)
    
    input_video = sys.argv[1]
    video_to_append = sys.argv[2]
    output_video = sys.argv[3]
    
    append_video(input_video, video_to_append, output_video)

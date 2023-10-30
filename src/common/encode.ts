import * as iconv from 'iconv-lite';

/**
 * This helper function can be used to extend the list of supported encodings.
 * Reference: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
 * 
 * @param buffer The source buffer to decode.
 * @param encoding The encoding to use to decode the source buffer.
 * 
 * @returns The string decoded from the buffer.
 */
export function bufferToString(buffer: Buffer, encoding: BufferEncoding | 'iso88592'): string {
    if (encoding === 'iso88592') {
        return iconv.decode(buffer, 'iso88592');
    } else {
        return buffer.toString(encoding);
    }
}
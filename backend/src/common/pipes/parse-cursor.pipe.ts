import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseCursorPipe implements PipeTransform {
  transform(value: string | undefined): string | undefined {
    if (!value) return undefined;
    try {
      Buffer.from(value, 'base64url').toString('utf8');
      return value;
    } catch {
      throw new BadRequestException('Invalid cursor value');
    }
  }
}

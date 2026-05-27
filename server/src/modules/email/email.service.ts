import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 465),
      secure: this.configService.get<number>('SMTP_PORT', 465) === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendCode(to: string, code: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', '旅途博客');

    try {
      await this.transporter.sendMail({
        from: `"${from}" <${this.configService.get<string>('SMTP_USER')}>`,
        to,
        subject: `【${from}】邮箱验证码`,
        html: `
          <div style="max-width:600px;margin:0 auto;padding:20px;font-family:sans-serif;">
            <h2 style="color:#333;">邮箱验证码</h2>
            <p>您好，</p>
            <p>您的验证码为：</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1890ff;">
                ${code}
              </span>
            </div>
            <p style="color:#999;font-size:12px;">验证码 5 分钟内有效，请勿泄露给他人。</p>
            <p style="color:#999;font-size:12px;">如果不是您本人操作，请忽略此邮件。</p>
          </div>
        `,
      });
      this.logger.log(`验证码已发送至 ${to}`);
    } catch (error) {
      this.logger.error(`邮件发送失败: ${error}`);
      throw new Error('邮件发送失败，请检查邮箱地址或稍后重试');
    }
  }
}

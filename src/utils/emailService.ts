import { SessionData } from "../types/session";

export class EmailService {
  static async sendSessionReport(
    sessionData: SessionData,
    chartImageBase64: string
  ): Promise<void> {
    try {
      const emailData = {
        to: sessionData.email,
        subject: `Your Heart Rate Session Report - ${sessionData.name}`,
        html: this.generateEmailHTML(sessionData),
        attachments: [
          {
            content: chartImageBase64,
            filename: "chart.png",
            cid: "heartRateChart",
            encoding: "base64"
          }
        ]
      };

      const response = await window.electronAPI.callAPI(
        "email-send",
        emailData
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to send email");
      }

      console.log(`Email sent successfully to ${sessionData.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  private static generateEmailHTML(sessionData: SessionData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #333; }
          .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
          .chart-container { text-align: center; margin: 30px 0; }
          .chart-image { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Heart Rate Session Report</h1>
            <h2>Hello ${sessionData.name}!</h2>
            <p>Here's your workout summary from ${sessionData.timestamp.toLocaleDateString()}</p>
          </div>
          
          <div class="chart-container">
            <img src="cid:heartRateChart" alt="Heart Rate Chart" class="chart-image" />
          </div>
          
          <div class="footer">
            <p>Keep up the great work!</p>
            <p>Heart Rate Monitor App</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

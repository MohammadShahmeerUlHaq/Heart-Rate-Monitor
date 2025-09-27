// import { SessionData } from '../types/session';

// export class EmailService {
//   private static readonly EMAIL_CONFIG = {
//     sender: 'heartratemonitor@gmail.com',
//     password: 'puiprcgewpajyniu'
//   };

//   static async sendSessionReport(sessionData: SessionData, chartImageBase64: string): Promise<void> {
//     try {
//       const emailData = {
//         to: sessionData.email,
//         subject: `Your Heart Rate Session Report - ${sessionData.name}`,
//         html: this.generateEmailHTML(sessionData),
//         attachments: [
//           {
//             filename: `${sessionData.name}_session_chart.png`,
//             content: chartImageBase64,
//             encoding: 'base64'
//           }
//         ]
//       };

//       // const response = await fetch('/api/email/send', {
//       //   method: 'POST',
//       //   headers: {
//       //     'Content-Type': 'application/json',
//       //   },
//       //   body: JSON.stringify(emailData)
//       // });

//       // Use Electron IPC instead of fetch for API calls
//       const response = await window.electronAPI.callAPI('email-send', emailData);

//       if (!response.success) {
//         throw new Error(response.error || 'Failed to send email');
//       }

//       console.log(`Email sent successfully to ${sessionData.email}`);
//     } catch (error) {
//       console.error('Error sending email:', error);
//       throw error;
//     }
//   }

//   private static generateEmailHTML(sessionData: SessionData): string {
//     const formatTime = (seconds: number) => {
//       const minutes = Math.floor(seconds / 60);
//       const remainingSeconds = seconds % 60;
//       return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
//     };

//     return `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
//           .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
//           .header { text-align: center; margin-bottom: 30px; }
//           .stats { display: flex; justify-content: space-around; margin: 20px 0; }
//           .stat { text-align: center; }
//           .stat-value { font-size: 24px; font-weight: bold; color: #333; }
//           .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
//           .chart-container { text-align: center; margin: 30px 0; }
//           .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>Heart Rate Session Report</h1>
//             <h2>Hello ${sessionData.name}!</h2>
//             <p>Here's your workout summary from ${sessionData.timestamp.toLocaleDateString()}</p>
//           </div>
          
//           <div class="stats">
//             <div class="stat">
//               <div class="stat-value">${Math.round(sessionData.totalBluePoints)}</div>
//               <div class="stat-label">Blue Points</div>
//             </div>
//             <div class="stat">
//               <div class="stat-value">${Math.round(sessionData.totalCalories)}</div>
//               <div class="stat-label">Calories</div>
//             </div>
//             <div class="stat">
//               <div class="stat-value">${Math.round(sessionData.averageHeartRate)}</div>
//               <div class="stat-label">Avg HR (BPM)</div>
//             </div>
//             <div class="stat">
//               <div class="stat-value">${sessionData.maxHeartRate}</div>
//               <div class="stat-label">Max HR (BPM)</div>
//             </div>
//           </div>
          
//           <div class="stats">
//             <div class="stat">
//               <div class="stat-value">${formatTime(sessionData.totalSessionTime)}</div>
//               <div class="stat-label">Session Time</div>
//             </div>
//           </div>
          
//           <div class="chart-container">
//             <p>Your detailed workout chart is attached to this email.</p>
//           </div>
          
//           <div class="footer">
//             <p>Keep up the great work!</p>
//             <p>Heart Rate Monitor App</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;
//   }
// }

import { SessionData } from '../types/session';

export class EmailService {
  private static readonly EMAIL_CONFIG = {
    sender: 'heartratemonitor@gmail.com',
    password: 'puiprcgewpajyniu'
  };

  static async sendSessionReport(sessionData: SessionData, chartImageBase64: string): Promise<void> {
    try {
      const emailData = {
        to: sessionData.email,
        subject: `Your Heart Rate Session Report - ${sessionData.name}`,
        html: this.generateEmailHTML(sessionData, chartImageBase64),
        attachments: [
          {
            filename: 'chart.png',
            content: chartImageBase64,
            encoding: 'base64',
            cid: 'heartRateChart' // Content ID for embedding
          }
        ]
      };

      // Use Electron IPC instead of fetch for API calls
      const response = await window.electronAPI.callAPI('email-send', emailData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to send email');
      }

      console.log(`Email sent successfully to ${sessionData.email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  private static generateEmailHTML(sessionData: SessionData, chartImageBase64: string): string {
    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

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
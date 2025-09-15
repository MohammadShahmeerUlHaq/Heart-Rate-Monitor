const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PFYcur25WOXR@ep-floral-wildflower-advjfh6o-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'heartratemonitor@gmail.com',
    pass: 'puiprcgewpajyniu'
  }
});

// Chart configuration
const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width: 800, 
  height: 600,
  backgroundColour: '#2D3748'
});

class APIHandlers {
  // Database handlers
  static async handleDatabaseInit(query) {
    try {
      await pool.query(query);
      return { success: true };
    } catch (error) {
      console.error('Database init error:', error);
      throw error;
    }
  }

  static async handleDatabaseInsert(query, values) {
    try {
      const result = await pool.query(query, values);
      return { success: true, id: result.rows[0]?.id };
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  // Email handler
  static async handleEmailSend(emailData) {
    try {
      const mailOptions = {
        from: 'heartratemonitor@gmail.com',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments
      };

      await emailTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  // Chart generation handler
  static async handleChartGeneration(chartData) {
    try {
      const { sessionData } = chartData;
      
      // Generate time labels (5-minute intervals)
      const timeLabels = [];
      const dataPoints = sessionData.heartRateData.length;
      const totalMinutes = Math.floor(sessionData.totalSessionTime / 60);
      const intervalMinutes = Math.max(1, Math.floor(totalMinutes / dataPoints));
      
      for (let i = 0; i < dataPoints; i++) {
        timeLabels.push(`${i * intervalMinutes}`);
      }

      const configuration = {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Heart Rate',
              data: sessionData.heartRateData,
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              yAxisID: 'y1',
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4
            },
            {
              label: 'Blue Points',
              data: sessionData.bluePointsData,
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              yAxisID: 'y',
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: `${sessionData.name} - Heart Rate Session`,
              color: '#FFFFFF',
              font: { size: 20, weight: 'bold' }
            },
            legend: {
              labels: { color: '#FFFFFF' }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Time (minutes)',
                color: '#FFFFFF'
              },
              ticks: { color: '#FFFFFF' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Blue Points',
                color: '#3B82F6'
              },
              ticks: { color: '#3B82F6' },
              grid: { color: 'rgba(59, 130, 246, 0.1)' }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Heart Rate (BPM)',
                color: '#EF4444'
              },
              ticks: { color: '#EF4444' },
              grid: { drawOnChartArea: false }
            }
          }
        }
      };

      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
      const imageBase64 = imageBuffer.toString('base64');
      
      return { success: true, imageBase64 };
    } catch (error) {
      console.error('Chart generation error:', error);
      throw error;
    }
  }
}

module.exports = { APIHandlers };
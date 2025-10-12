const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

// Database connection
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_PFYcur25WOXR@ep-floral-wildflower-advjfh6o-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "contact.healthmate@gmail.com",
    pass: "puiprcgewpajyniu",
  },
});

// Chart configuration
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 600,
  backgroundColour: "#2D3748",
});

class APIHandlers {
  // Database handlers
  static async handleDatabaseInit(query) {
    try {
      await pool.query(query);
      return { success: true };
    } catch (error) {
      console.error("Database init error:", error);
      throw error;
    }
  }

  static async handleDatabaseInsert(query, values) {
    try {
      const result = await pool.query(query, values);
      return { success: true, id: result.rows[0]?.id };
    } catch (error) {
      console.error("Database insert error:", error);
      throw error;
    }
  }

  // Email handler
  static async handleEmailSend(emailData) {
    try {
      const mailOptions = {
        from: "heartratemonitor@gmail.com",
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments,
      };

      await emailTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Email send error:", error);
      throw error;
    }
  }

  // Chart generation handler
  static async handleChartGeneration(chartData) {
    try {
      const { sessionData } = chartData;

      // Generate time labels (data points are every 10 seconds)
      const timeLabels = [];
      const dataPoints = sessionData.heartRateData.length;
      const intervalSeconds = 10; // Each data point represents 10 seconds

      // Create labels - show every minute for readability, or adjust based on data length
      const labelInterval = Math.max(1, Math.ceil(dataPoints / 20)); // Show ~20 labels max

      for (let i = 0; i < dataPoints; i++) {
        if (i % labelInterval === 0 || i === dataPoints - 1) {
          const totalSeconds = i * intervalSeconds;
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          timeLabels.push(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        } else {
          timeLabels.push(""); // Empty label for intermediate points
        }
      }

      // Format session time
      const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
      };

      // Create stats text for display
      const statsText = [
        `Blue Points: ${Math.round(sessionData.totalBluePoints)}`,
        `Calories: ${Math.round(sessionData.totalCalories)}`,
        `Avg HR: ${Math.round(sessionData.averageHeartRate)} BPM`,
        `Max HR: ${sessionData.maxHeartRate} BPM`,
        `Session Time: ${formatTime(sessionData.totalSessionTime)}`,
      ];

      const configuration = {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: "Heart Rate",
              data: sessionData.heartRateData,
              borderColor: "#EF4444",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              yAxisID: "y1",
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4,
            },
            {
              label: "Blue Points",
              data: sessionData.bluePointsData,
              borderColor: "#3B82F6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              yAxisID: "y",
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          layout: {
            padding: {
              bottom: 80, // Add padding at bottom for stats
            },
          },
          plugins: {
            title: {
              display: true,
              text: `${sessionData.name} - Heart Rate Session`,
              color: "#FFFFFF",
              font: { size: 20, weight: "bold" },
            },
            legend: {
              labels: { color: "#FFFFFF" },
            },
            // Custom plugin to draw stats at the bottom
            afterDraw: {
              id: "statsDisplay",
              afterDraw: (chart) => {
                const ctx = chart.ctx;
                const chartArea = chart.chartArea;

                ctx.save();
                ctx.fillStyle = "#FFFFFF";
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";

                // Calculate positions for stats
                const statsY = chart.height - 60;
                const statsWidth = chartArea.right - chartArea.left;
                const statsPerRow = 3;
                const statWidth = statsWidth / statsPerRow;

                // Draw first row (3 stats)
                for (
                  let i = 0;
                  i < Math.min(statsPerRow, statsText.length);
                  i++
                ) {
                  const x = chartArea.left + (i + 0.5) * statWidth;
                  ctx.fillText(statsText[i], x, statsY);
                }

                // Draw second row (remaining stats)
                if (statsText.length > statsPerRow) {
                  const remainingStats = statsText.slice(statsPerRow);
                  const secondRowWidth = statWidth * remainingStats.length;
                  const startX =
                    chartArea.left + (statsWidth - secondRowWidth) / 2;

                  for (let i = 0; i < remainingStats.length; i++) {
                    const x = startX + (i + 0.5) * statWidth;
                    ctx.fillText(remainingStats[i], x, statsY + 25);
                  }
                }

                ctx.restore();
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "Time (MM:SS)",
                color: "#FFFFFF",
              },
              ticks: { color: "#FFFFFF" },
              grid: { color: "rgba(255, 255, 255, 0.1)" },
            },
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: {
                display: true,
                text: "Blue Points",
                color: "#3B82F6",
              },
              ticks: { color: "#3B82F6" },
              grid: { color: "rgba(59, 130, 246, 0.1)" },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "Heart Rate (BPM)",
                color: "#EF4444",
              },
              ticks: { color: "#EF4444" },
              grid: { drawOnChartArea: false },
            },
          },
        },
        plugins: [
          {
            id: "statsDisplay",
            afterDraw: (chart) => {
              const ctx = chart.ctx;
              const chartArea = chart.chartArea;

              ctx.save();
              ctx.fillStyle = "#FFFFFF";
              ctx.font = "bold 14px Arial";
              ctx.textAlign = "center";

              // Calculate positions for stats
              const statsY = chart.height - 60;
              const statsWidth = chartArea.right - chartArea.left;
              const statsPerRow = 3;
              const statWidth = statsWidth / statsPerRow;

              // Draw first row (3 stats)
              for (
                let i = 0;
                i < Math.min(statsPerRow, statsText.length);
                i++
              ) {
                const x = chartArea.left + (i + 0.5) * statWidth;
                ctx.fillText(statsText[i], x, statsY);
              }

              // Draw second row (remaining stats)
              if (statsText.length > statsPerRow) {
                const remainingStats = statsText.slice(statsPerRow);
                const secondRowWidth = statWidth * remainingStats.length;
                const startX =
                  chartArea.left + (statsWidth - secondRowWidth) / 2;

                for (let i = 0; i < remainingStats.length; i++) {
                  const x = startX + (i + 0.5) * statWidth;
                  ctx.fillText(remainingStats[i], x, statsY + 25);
                }
              }

              ctx.restore();
            },
          },
        ],
      };

      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
      const imageBase64 = imageBuffer.toString("base64");

      return { success: true, imageBase64 };
    } catch (error) {
      console.error("Chart generation error:", error);
      throw error;
    }
  }
  // static async handleChartGeneration(chartData) {
  //   try {
  //     const { sessionData } = chartData;

  //     // Generate time labels (5-minute intervals)
  //     const timeLabels = [];
  //     const dataPoints = sessionData.heartRateData.length;
  //     const totalMinutes = Math.floor(sessionData.totalSessionTime / 60);
  //     const intervalMinutes = Math.max(1, Math.floor(totalMinutes / dataPoints));

  //     for (let i = 0; i < dataPoints; i++) {
  //       timeLabels.push(`${i * intervalMinutes}`);
  //     }

  //     // Format session time
  //     const formatTime = (seconds) => {
  //       const minutes = Math.floor(seconds / 60);
  //       const remainingSeconds = seconds % 60;
  //       return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  //     };

  //     // Create stats text for display
  //     const statsText = [
  //       `Blue Points: ${Math.round(sessionData.totalBluePoints)}`,
  //       `Calories: ${Math.round(sessionData.totalCalories)}`,
  //       `Avg HR: ${Math.round(sessionData.averageHeartRate)} BPM`,
  //       `Max HR: ${sessionData.maxHeartRate} BPM`,
  //       `Session Time: ${formatTime(sessionData.totalSessionTime)}`
  //     ];

  //     const configuration = {
  //       type: 'line',
  //       data: {
  //         labels: timeLabels,
  //         datasets: [
  //           {
  //             label: 'Heart Rate',
  //             data: sessionData.heartRateData,
  //             borderColor: '#EF4444',
  //             backgroundColor: 'rgba(239, 68, 68, 0.1)',
  //             yAxisID: 'y1',
  //             tension: 0.4,
  //             pointRadius: 2,
  //             pointHoverRadius: 4
  //           },
  //           {
  //             label: 'Blue Points',
  //             data: sessionData.bluePointsData,
  //             borderColor: '#3B82F6',
  //             backgroundColor: 'rgba(59, 130, 246, 0.1)',
  //             yAxisID: 'y',
  //             tension: 0.4,
  //             pointRadius: 2,
  //             pointHoverRadius: 4
  //           }
  //         ]
  //       },
  //       options: {
  //         responsive: true,
  //         layout: {
  //           padding: {
  //             bottom: 80 // Add padding at bottom for stats
  //           }
  //         },
  //         plugins: {
  //           title: {
  //             display: true,
  //             text: `${sessionData.name} - Heart Rate Session`,
  //             color: '#FFFFFF',
  //             font: { size: 20, weight: 'bold' }
  //           },
  //           legend: {
  //             labels: { color: '#FFFFFF' }
  //           },
  //           // Custom plugin to draw stats at the bottom
  //           afterDraw: {
  //             id: 'statsDisplay',
  //             afterDraw: (chart) => {
  //               const ctx = chart.ctx;
  //               const chartArea = chart.chartArea;

  //               ctx.save();
  //               ctx.fillStyle = '#FFFFFF';
  //               ctx.font = 'bold 14px Arial';
  //               ctx.textAlign = 'center';

  //               // Calculate positions for stats
  //               const statsY = chart.height - 60;
  //               const statsWidth = chartArea.right - chartArea.left;
  //               const statsPerRow = 3;
  //               const statWidth = statsWidth / statsPerRow;

  //               // Draw first row (3 stats)
  //               for (let i = 0; i < Math.min(statsPerRow, statsText.length); i++) {
  //                 const x = chartArea.left + (i + 0.5) * statWidth;
  //                 ctx.fillText(statsText[i], x, statsY);
  //               }

  //               // Draw second row (remaining stats)
  //               if (statsText.length > statsPerRow) {
  //                 const remainingStats = statsText.slice(statsPerRow);
  //                 const secondRowWidth = statWidth * remainingStats.length;
  //                 const startX = chartArea.left + (statsWidth - secondRowWidth) / 2;

  //                 for (let i = 0; i < remainingStats.length; i++) {
  //                   const x = startX + (i + 0.5) * statWidth;
  //                   ctx.fillText(remainingStats[i], x, statsY + 25);
  //                 }
  //               }

  //               ctx.restore();
  //             }
  //           }
  //         },
  //         scales: {
  //           x: {
  //             title: {
  //               display: true,
  //               text: 'Time (minutes)',
  //               color: '#FFFFFF'
  //             },
  //             ticks: { color: '#FFFFFF' },
  //             grid: { color: 'rgba(255, 255, 255, 0.1)' }
  //           },
  //           y: {
  //             type: 'linear',
  //             display: true,
  //             position: 'left',
  //             title: {
  //               display: true,
  //               text: 'Blue Points',
  //               color: '#3B82F6'
  //             },
  //             ticks: { color: '#3B82F6' },
  //             grid: { color: 'rgba(59, 130, 246, 0.1)' }
  //           },
  //           y1: {
  //             type: 'linear',
  //             display: true,
  //             position: 'right',
  //             title: {
  //               display: true,
  //               text: 'Heart Rate (BPM)',
  //               color: '#EF4444'
  //             },
  //             ticks: { color: '#EF4444' },
  //             grid: { drawOnChartArea: false }
  //           }
  //         }
  //       },
  //       plugins: [{
  //         id: 'statsDisplay',
  //         afterDraw: (chart) => {
  //           const ctx = chart.ctx;
  //           const chartArea = chart.chartArea;

  //           ctx.save();
  //           ctx.fillStyle = '#FFFFFF';
  //           ctx.font = 'bold 14px Arial';
  //           ctx.textAlign = 'center';

  //           // Calculate positions for stats
  //           const statsY = chart.height - 60;
  //           const statsWidth = chartArea.right - chartArea.left;
  //           const statsPerRow = 3;
  //           const statWidth = statsWidth / statsPerRow;

  //           // Draw first row (3 stats)
  //           for (let i = 0; i < Math.min(statsPerRow, statsText.length); i++) {
  //             const x = chartArea.left + (i + 0.5) * statWidth;
  //             ctx.fillText(statsText[i], x, statsY);
  //           }

  //           // Draw second row (remaining stats)
  //           if (statsText.length > statsPerRow) {
  //             const remainingStats = statsText.slice(statsPerRow);
  //             const secondRowWidth = statWidth * remainingStats.length;
  //             const startX = chartArea.left + (statsWidth - secondRowWidth) / 2;

  //             for (let i = 0; i < remainingStats.length; i++) {
  //               const x = startX + (i + 0.5) * statWidth;
  //               ctx.fillText(remainingStats[i], x, statsY + 25);
  //             }
  //           }

  //           ctx.restore();
  //         }
  //       }]
  //     };

  //     const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  //     const imageBase64 = imageBuffer.toString('base64');

  //     return { success: true, imageBase64 };
  //   } catch (error) {
  //     console.error('Chart generation error:', error);
  //     throw error;
  //   }
  // }
  // static async handleChartGeneration(chartData) {
  //   try {
  //     const { sessionData } = chartData;

  //     // Generate time labels (5-minute intervals)
  //     const timeLabels = [];
  //     const dataPoints = sessionData.heartRateData.length;
  //     const totalMinutes = Math.floor(sessionData.totalSessionTime / 60);
  //     const intervalMinutes = Math.max(1, Math.floor(totalMinutes / dataPoints));

  //     for (let i = 0; i < dataPoints; i++) {
  //       timeLabels.push(`${i * intervalMinutes}`);
  //     }

  //     const configuration = {
  //       type: 'line',
  //       data: {
  //         labels: timeLabels,
  //         datasets: [
  //           {
  //             label: 'Heart Rate',
  //             data: sessionData.heartRateData,
  //             borderColor: '#EF4444',
  //             backgroundColor: 'rgba(239, 68, 68, 0.1)',
  //             yAxisID: 'y1',
  //             tension: 0.4,
  //             pointRadius: 2,
  //             pointHoverRadius: 4
  //           },
  //           {
  //             label: 'Blue Points',
  //             data: sessionData.bluePointsData,
  //             borderColor: '#3B82F6',
  //             backgroundColor: 'rgba(59, 130, 246, 0.1)',
  //             yAxisID: 'y',
  //             tension: 0.4,
  //             pointRadius: 2,
  //             pointHoverRadius: 4
  //           }
  //         ]
  //       },
  //       options: {
  //         responsive: true,
  //         plugins: {
  //           title: {
  //             display: true,
  //             text: `${sessionData.name} - Heart Rate Session`,
  //             color: '#FFFFFF',
  //             font: { size: 20, weight: 'bold' }
  //           },
  //           legend: {
  //             labels: { color: '#FFFFFF' }
  //           }
  //         },
  //         scales: {
  //           x: {
  //             title: {
  //               display: true,
  //               text: 'Time (minutes)',
  //               color: '#FFFFFF'
  //             },
  //             ticks: { color: '#FFFFFF' },
  //             grid: { color: 'rgba(255, 255, 255, 0.1)' }
  //           },
  //           y: {
  //             type: 'linear',
  //             display: true,
  //             position: 'left',
  //             title: {
  //               display: true,
  //               text: 'Blue Points',
  //               color: '#3B82F6'
  //             },
  //             ticks: { color: '#3B82F6' },
  //             grid: { color: 'rgba(59, 130, 246, 0.1)' }
  //           },
  //           y1: {
  //             type: 'linear',
  //             display: true,
  //             position: 'right',
  //             title: {
  //               display: true,
  //               text: 'Heart Rate (BPM)',
  //               color: '#EF4444'
  //             },
  //             ticks: { color: '#EF4444' },
  //             grid: { drawOnChartArea: false }
  //           }
  //         }
  //       }
  //     };

  //     const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  //     const imageBase64 = imageBuffer.toString('base64');

  //     return { success: true, imageBase64 };
  //   } catch (error) {
  //     console.error('Chart generation error:', error);
  //     throw error;
  //   }
  // }
}

module.exports = { APIHandlers };

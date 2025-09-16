import { SessionData } from '../types/session';

export class ChartGenerator {
  static async generateSessionChart(sessionData: SessionData): Promise<string> {
    try {
      const chartData = {
        sessionData,
        width: 800,
        height: 600
      };

      // const response = await fetch('/api/chart/generate', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(chartData)
      // });

      // Use Electron IPC instead of fetch for API calls
      const response = await window.electronAPI.callAPI('chart-generate', chartData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate chart');
      }

      return response.imageBase64;
    } catch (error) {
      console.error('Error generating chart:', error);
      throw error;
    }
  }

  static generateTimeLabels(dataLength: number, totalSessionTime: number): string[] {
    const labels: string[] = [];
    const intervalMinutes = Math.max(1, Math.floor(totalSessionTime / 60 / dataLength));
    
    for (let i = 0; i < dataLength; i++) {
      const minutes = i * intervalMinutes;
      labels.push(`${minutes}m`);
    }
    
    return labels;
  }
}
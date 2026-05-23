import {
  CategoryScale,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register chart.js modules inside the dynamically-imported chunk so the about
// page's initial bundle stays clean. This file is only ever loaded via next/dynamic.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface AttendanceLineChartProps {
  data: ChartData<"line">;
  options: ChartOptions<"line">;
}

export default function AttendanceLineChart({ data, options }: AttendanceLineChartProps) {
  return <Line data={data} options={options} />;
}

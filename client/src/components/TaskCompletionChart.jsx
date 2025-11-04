import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function TaskCompletionChart({ tasks }) {
  // Calculate task statistics
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  // Doughnut chart data
  const doughnutData = {
    labels: ['Completed', 'In Progress', 'To Do'],
    datasets: [
      {
        data: [completedTasks, inProgressTasks, todoTasks],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Task Status Distribution',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  // Calculate completion rate by team member
  const tasksByMember = {};
  tasks.forEach(task => {
    const assignee = task.assignee || 'Unassigned';
    if (!tasksByMember[assignee]) {
      tasksByMember[assignee] = { total: 0, completed: 0 };
    }
    tasksByMember[assignee].total++;
    if (task.status === 'completed') {
      tasksByMember[assignee].completed++;
    }
  });

  const members = Object.keys(tasksByMember);
  const barData = {
    labels: members,
    datasets: [
      {
        label: 'Completed',
        data: members.map(m => tasksByMember[m].completed),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Total',
        data: members.map(m => tasksByMember[m].total),
        backgroundColor: 'rgba(156, 163, 175, 0.4)',
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Task Completion by Team Member',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Doughnut Chart */}
        <div className="h-64">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>

        {/* Bar Chart */}
        <div className="h-64">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">{todoTasks}</p>
            <p className="text-sm text-gray-500">To Do</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCompletionChart;

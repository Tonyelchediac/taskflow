import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/adminHeader";
import { getUser, authFetch } from "../utils/auth";

export default function AdminPage() {
  const [userData, setUserData] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    todoTasks: 0,
    totalAlerts: 0,
    urgentAlerts: 0,
    recentTasks: [],
    recentProjects: [],
    taskStatusData: [],
    projectProgressData: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const decoded = getUser();
    if (!decoded) {
      navigate('/login');
      return;
    }
    const userId = decoded.userID;

    // Get user data
    authFetch(`https://taskflow-9hgr.onrender.com/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUserData(data);
      })
      .catch(err => console.log(err));

    // Fetch all dashboard data
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch users (from admin endpoint which includes all details)
      const usersRes = await authFetch('https://taskflow-9hgr.onrender.com/admin/users');
      const users = await usersRes.json();

      // Fetch users details
      const usersDetailsRes = await authFetch('https://taskflow-9hgr.onrender.com/usersdetails');
      const usersDetails = await usersDetailsRes.json();

      // Fetch projects
      const projectsRes = await authFetch('https://taskflow-9hgr.onrender.com/projects');
      const projects = await projectsRes.json();

      // Fetch all tasks
      const tasksRes = await authFetch('https://taskflow-9hgr.onrender.com/tasks');
      const tasks = await tasksRes.json();

      // Fetch alerts
      const alertsRes = await authFetch('https://taskflow-9hgr.onrender.com/alerts');
      const alerts = await alertsRes.json();

      // Calculate task stats
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const todoTasks = tasks.filter(t => t.status === 'todo').length;
      
      // Calculate alert stats
      const urgentAlerts = alerts.filter(a => a.alertStatus === 'urgent').length;
      
      // Get recent tasks (last 5)
      const recentTasks = tasks.slice(0, 5);
      
      // Get recent projects (last 5)
      const recentProjects = projects.slice(0, 5);
      
      // Task status data for chart
      const taskStatusData = [
        { label: 'Completed', value: completedTasks, color: 'bg-green-500' },
        { label: 'Pending', value: pendingTasks, color: 'bg-yellow-500' },
        { label: 'To Do', value: todoTasks, color: 'bg-gray-400' }
      ];
      
      // Project progress data
      const projectProgressData = projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectID === p.id);
        const completed = projectTasks.filter(t => t.status === 'completed').length;
        const total = projectTasks.length;
        return {
          name: p.projectTitle,
          completed: completed,
          total: total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      });

      setDashboardData({
        totalUsers: users.length,
        totalAdmins: users.filter(u => u.status === 'ad').length,
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: completedTasks,
        pendingTasks: pendingTasks,
        todoTasks: todoTasks,
        totalAlerts: alerts.length,
        urgentAlerts: urgentAlerts,
        recentTasks: recentTasks,
        recentProjects: recentProjects,
        taskStatusData: taskStatusData,
        projectProgressData: projectProgressData
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700'
    };
    return colors[status] || colors.pending;
  };

  // Get type color
  const getTypeColor = (type) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700',
      meeting: 'bg-blue-100 text-blue-700',
      design: 'bg-purple-100 text-purple-700',
      development: 'bg-indigo-100 text-indigo-700',
      review: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header page="./admin" userData={userData} />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Administrative Overview</h2>
          <p className="text-gray-600">Real-time performance metrics and organizational control center.</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.totalUsers}</p>
                <p className="text-xs text-gray-400 mt-1">{dashboardData.totalAdmins} Admins</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">group</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.totalProjects}</p>
                <p className="text-xs text-gray-400 mt-1">Active projects</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-2xl">assignment</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.totalTasks}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dashboardData.completedTasks} completed
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">task</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.totalAlerts}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dashboardData.urgentAlerts} urgent
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Status & Project Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Task Status Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
            <div className="space-y-4">
              {dashboardData.taskStatusData.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`} 
                      style={{ 
                        width: dashboardData.totalTasks > 0 
                          ? `${(item.value / dashboardData.totalTasks) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Progress */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Progress</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
              {dashboardData.projectProgressData.length === 0 ? (
                <p className="text-gray-500 text-sm">No projects yet</p>
              ) : (
                dashboardData.projectProgressData.slice(0, 5).map((project, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate max-w-37.5">{project.name}</span>
                      <span className="font-semibold text-gray-900">{project.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${project.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">{project.completed}/{project.total} tasks</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
              <span className="text-xs text-gray-400">Latest 5</span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {dashboardData.recentTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No tasks yet</p>
              ) : (
                dashboardData.recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${getTypeColor(task.type)}`}>
                          {task.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-2">
                      Project #{task.projectID}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
              <span className="text-xs text-gray-400">Latest 5</span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {dashboardData.recentProjects.length === 0 ? (
                <p className="text-gray-500 text-sm">No projects yet</p>
              ) : (
                dashboardData.recentProjects.map((project) => {
                  const progress = dashboardData.projectProgressData.find(p => p.name === project.projectTitle);
                  return (
                    <div key={project.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.projectTitle}</p>
                          <p className="text-xs text-gray-500 truncate">{project.projectDescription}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${project.projectType === 'urgent' ? 'bg-red-100 text-red-700' : project.projectType === 'priority' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {project.projectType}
                        </span>
                      </div>
                      {progress && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">{progress.percentage}%</span>
                            <span className="text-gray-400">{progress.completed}/{progress.total} tasks</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                              style={{ width: `${progress.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/adminHeader";
import { getUser, authFetch } from "../utils/auth";

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [projectHealth, setProjectHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [projectFormData, setProjectFormData] = useState({
    projectTitle: "",
    projectDescription: "",
    projectType: "project"
  });
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    type: "",
    time: "",
    status: "pending",
    userId: "",
    projectId: ""
  });
  const [users, setUsers] = useState([]);

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

    // Fetch all users from usersdetails table for task assignment
    authFetch('https://taskflow-9hgr.onrender.com/usersdetails')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
      })
      .catch(err => console.log(err));

    // Fetch all projects
    fetchProjects();
  }, [navigate]);

  const fetchProjects = () => {
    authFetch('https://taskflow-9hgr.onrender.com/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setFilteredProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0]);
          fetchProjectDetails(data[0].id);
          fetchProjectHealth(data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  };

  const fetchProjectDetails = (projectId) => {
    authFetch(`https://taskflow-9hgr.onrender.com/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setSelectedProjectData(data);
      })
      .catch(err => console.log(err));
  };

  const fetchProjectHealth = (projectId) => {
    authFetch(`https://taskflow-9hgr.onrender.com/projects/${projectId}/health`)
      .then(res => res.json())
      .then(data => {
        setProjectHealth(data);
      })
      .catch(err => console.log(err));
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    fetchProjectDetails(project.id);
    fetchProjectHealth(project.id);
  };

  // Search function
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === "") {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project => 
        project.projectTitle?.toLowerCase().includes(term) ||
        project.projectDescription?.toLowerCase().includes(term) ||
        project.projectType?.toLowerCase().includes(term) ||
        project.id?.toString().includes(term)
      );
      setFilteredProjects(filtered);
      
      // If filtered projects exist and the selected project is not in the filtered list, select the first filtered project
      if (filtered.length > 0) {
        const isSelectedInFiltered = filtered.some(p => p.id === selectedProject?.id);
        if (!isSelectedInFiltered) {
          handleProjectSelect(filtered[0]);
        }
      } else {
        // If no projects match, clear the selected project
        setSelectedProject(null);
        setSelectedProjectData(null);
        setProjectHealth(null);
      }
    }
  };

  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setProjectFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();

    const decoded = getUser();
    if (!decoded) {
      alert("Please login again");
      return;
    }

    const projectData = {
      projectTitle: projectFormData.projectTitle.trim(),
      projectDescription: projectFormData.projectDescription.trim(),
      projectType: projectFormData.projectType
    };

    try {
      const url = editingProject ? `https://taskflow-9hgr.onrender.com/projects/${editingProject.id}` : 'https://taskflow-9hgr.onrender.com/projects';
      const method = editingProject ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method: method,
        body: JSON.stringify(projectData),
      });
      
      if (response.ok) {
        const project = await response.json();
        if (editingProject) {
          setProjects(prev => prev.map(p => p.id === project.id ? project : p));
        } else {
          setProjects(prev => [project, ...prev]);
        }
        // Update filtered projects
        setFilteredProjects(prev => {
          if (editingProject) {
            return prev.map(p => p.id === project.id ? project : p);
          } else {
            return [project, ...prev];
          }
        });
        alert(editingProject ? "Project updated successfully!" : "Project created successfully!");
        setProjectFormData({ projectTitle: "", projectDescription: "", projectType: "project" });
        setShowProjectForm(false);
        setEditingProject(null);
        // Refresh the selected project
        if (selectedProject) {
          fetchProjectDetails(selectedProject.id);
          fetchProjectHealth(selectedProject.id);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save project");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Error saving project. Please try again.");
    }
  };

const handleTaskSubmit = async (e) => {
  e.preventDefault();

  const decoded = getUser();
  if (!decoded) {
    alert("Please login again");
    return;
  }

  const taskData = {
    title: taskFormData.title.trim(),
    description: taskFormData.description.trim(),
    type: taskFormData.type,
    time: taskFormData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: taskFormData.status,
    userId: parseInt(taskFormData.userId),
    projectId: parseInt(taskFormData.projectId)
  };
    
    try {
      const url = editingTask ? `https://taskflow-9hgr.onrender.com/tasks/${editingTask.id}` : 'https://taskflow-9hgr.onrender.com/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method: method,
        body: JSON.stringify(taskData),
      });
      
      if (response.ok) {
        const task = await response.json();
        alert(editingTask ? "Task updated successfully!" : "Task added successfully!");
        setTaskFormData({ title: "", description: "", type: "", time: "", status: "pending", userId: "", projectId: "" });
        setShowTaskForm(false);
        setEditingTask(null);
        // Refresh project details
        if (selectedProject) {
          fetchProjectDetails(selectedProject.id);
          fetchProjectHealth(selectedProject.id);
        }
        fetchProjects();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save task");
      }
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Error saving task. Please try again.");
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || "",
      type: task.type,
      time: task.time || "",
      status: task.status,
      userId: task.userID.toString(),
      projectId: task.projectID.toString()
    });
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    const decoded = getUser();
    if (!decoded) {
      alert("Please login again");
      return;
    }
    const userId = decoded.userID;

    try {
      const response = await authFetch(`https://taskflow-9hgr.onrender.com/tasks/${taskId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        alert("Task deleted successfully!");
        // Refresh project details
        if (selectedProject) {
          fetchProjectDetails(selectedProject.id);
          fetchProjectHealth(selectedProject.id);
        }
        fetchProjects();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Error deleting task. Please try again.");
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setProjectFormData({
      projectTitle: project.projectTitle,
      projectDescription: project.projectDescription,
      projectType: project.projectType
    });
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? All associated tasks will also be deleted.")) {
      return;
    }

    try {
      const response = await authFetch(`https://taskflow-9hgr.onrender.com/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setFilteredProjects(prev => prev.filter(p => p.id !== projectId));
        if (selectedProject?.id === projectId) {
          const remainingProjects = projects.filter(p => p.id !== projectId);
          if (remainingProjects.length > 0) {
            handleProjectSelect(remainingProjects[0]);
          } else {
            setSelectedProject(null);
            setSelectedProjectData(null);
            setProjectHealth(null);
          }
        }
        alert("Project deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Error deleting project. Please try again.");
    }
  };

  const closeProjectForm = () => {
    setShowProjectForm(false);
    setEditingProject(null);
    setProjectFormData({ projectTitle: "", projectDescription: "", projectType: "project" });
  };

  const closeTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setTaskFormData({ title: "", description: "", type: "", time: "", status: "pending", userId: "", projectId: "" });
  };

  // Get tasks by status
  const getTasksByStatus = (tasks, status) => {
    return tasks?.filter(task => task.status === status) || [];
  };

  // Get unique users for a project
  const getProjectUsers = (tasks, allUsers) => {
    if (!tasks || !allUsers) return [];
    const userIds = [...new Set(tasks.map(task => task.userID))];
    return allUsers.filter(user => userIds.includes(user.id));
  };

  // Get user initials for avatar fallback
  const getUserInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  // Get project type color
  const getProjectTypeColor = (type) => {
    if (!type) return 'bg-gray-100 text-gray-700';
    const lowerType = type.toLowerCase();
    if (lowerType === 'urgent') return 'bg-red-100 text-red-700';
    if (lowerType === 'priority') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      todo: "bg-gray-100 text-gray-700",
      pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700"
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  const projectTasks = selectedProjectData?.tasks || [];
  const projectUsers = getProjectUsers(projectTasks, selectedProjectData?.users || []);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const health = projectHealth || { totalTasks: 0, completedTasks: 0, pendingTasks: 0, todoTasks: 0 };

  // Map statuses to columns
  const todoTasks = getTasksByStatus(projectTasks, 'todo');
  const inProgressTasks = getTasksByStatus(projectTasks, 'pending');
  const doneTasks = getTasksByStatus(projectTasks, 'completed');

  // Calculate completion percentage
  const completionPercentage = health.totalTasks > 0 ? Math.round((health.completedTasks / health.totalTasks) * 100) : 0;

  return (
    <>
      <Header page="./admin/projects" userData={userData} />
      <main className="flex flex-col md:flex-row">
        {/* aside content */}
        <aside className="w-full md:w-80 lg:w-96 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
              <button 
                onClick={() => setShowProjectForm(true)}
                className="p-2 w-10 h-10 rounded-full text-blue-600 hover:bg-blue-50 transition-colors"
                title="Add Project"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search projects by title, description, or type..."
                type="text"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="pt-5 flex-1 overflow-y-auto px-4 space-y-4 pb-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl">search_off</span>
                <p className="mt-2 text-sm">No projects found matching your search.</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                return (
                  <div
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all group ${
                      selectedProject?.id === project.id ? 'ring-2 ring-blue-500' : 'border border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${getProjectTypeColor(project.projectType)}`}>
                        {project.projectType || 'General'}
                      </span>
                      <div className="flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                          className="p-1 text-blue-600 rounded"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                          className="p-1 text-red-600 rounded"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {project.projectTitle}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {project.projectDescription}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* main content - keep the same */}
        <section className="flex-1 flex flex-col bg-gray-50">
          <div className="p-4 md:px-6 border-b border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                <span>Projects</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="text-blue-600 font-semibold">
                  {selectedProject?.projectTitle || 'Select a Project'}
                </span>
              </nav>
              <h2 className="text-2xl font-bold text-gray-900">
                Task Overview
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button 
                onClick={() => {
                  setTaskFormData(prev => ({ ...prev, projectId: selectedProject?.id || "" }));
                  setShowTaskForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Task
              </button>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="material-symbols-outlined text-sm">assignment</span>
                <span className="font-medium">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
          </div>

          {/* Project Health Card */}
          {selectedProject ? (
            <div className="m-4 md:m-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Project Health</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-2xl font-bold text-gray-900">{completionPercentage}%</span>
                    <span className="text-sm text-gray-500">Complete</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{health.totalTasks || 0}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{health.completedTasks || 0}</div>
                    <div className="text-xs text-gray-500">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{health.pendingTasks || 0}</div>
                    <div className="text-xs text-gray-500">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-400">{health.todoTasks || 0}</div>
                    <div className="text-xs text-gray-500">To Do</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="m-4 md:m-6 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300">folder_open</span>
              <p className="mt-2 text-gray-500">No project selected or found.</p>
              <p className="text-sm text-gray-400">Please select a project from the sidebar.</p>
            </div>
          )}

          {/* Task columns - keep the same */}
          <div className="flex-1 p-4 pb-20 md:p-6 flex gap-4 flex-col lg:flex-row overflow-x-auto">
            {/* To-Do Column - status: todo */}
            <div className="min-w-70 flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <h4 className="font-semibold text-gray-900">To-Do</h4>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-bold text-gray-600">
                    {todoTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {todoTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm bg-white rounded-xl border border-gray-200">
                    No tasks to do
                  </div>
                ) : (
                  todoTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-400 hover:shadow-md transition-shadow group"
                    >
                      <div className="flex justify-between mb-2">
                        <span className="px-2 bg-gray-100 text-gray-600 flex justify-center items-center text-[10px] font-bold rounded uppercase">
                          {task.type || 'General'}
                        </span>
                        <div className="flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-1 text-blue-600 rounded"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-red-600 rounded"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-1 leading-tight">
                        {task.title}
                      </h5>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {task.userImage ? (
                            <img
                              className="w-6 h-6 rounded-full object-cover border border-gray-200"
                              src={task.userImage}
                              alt={task.username || `User ${task.userID}`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.className = 'w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border border-gray-200';
                                e.target.parentElement.textContent = getUserInitials(task.username || `User ${task.userID}`);
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border border-gray-200">
                              {getUserInitials(task.username || `User ${task.userID}`)}
                            </div>
                          )}
                          <span className="text-xs text-gray-600 font-medium">
                            {task.username || `User #${task.userID}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <span>{task.time || 'No time'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* In Progress Column - status: pending */}
            <div className="min-w-70 flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <h4 className="font-semibold text-gray-900">In Progress</h4>
                  <span className="bg-blue-50 px-2 py-0.5 rounded-full text-xs font-bold text-blue-600">
                    {inProgressTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {inProgressTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm bg-white rounded-xl border border-gray-200">
                    No tasks in progress
                  </div>
                ) : (
                  inProgressTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow group"
                    >
                      <div className="flex justify-between mb-2">
                        <span className="px-2 bg-gray-100 text-gray-600 flex justify-center items-center text-[10px] font-bold rounded uppercase">
                          {task.type || 'General'}
                        </span>
                        <div className="flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-1 text-blue-600 rounded"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-red-600 rounded"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-1 leading-tight">
                        {task.title}
                      </h5>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {task.userImage ? (
                            <img
                              className="w-6 h-6 rounded-full object-cover border border-gray-200"
                              src={task.userImage}
                              alt={task.username || `User ${task.userID}`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.className = 'w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border border-gray-200';
                                e.target.parentElement.textContent = getUserInitials(task.username || `User ${task.userID}`);
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border border-gray-200">
                              {getUserInitials(task.username || `User ${task.userID}`)}
                            </div>
                          )}
                          <span className="text-xs text-gray-600 font-medium">
                            {task.username || `User #${task.userID}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Done Column - status: completed */}
            <div className="min-w-70 flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <h4 className="font-semibold text-gray-900">Done</h4>
                  <span className="bg-green-50 px-2 py-0.5 rounded-full text-xs font-bold text-green-600">
                    {doneTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {doneTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm bg-white rounded-xl border border-gray-200">
                    No completed tasks
                  </div>
                ) : (
                  doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 opacity-75 hover:opacity-100 transition-opacity group"
                    >
                      <div className="flex justify-between mb-2">
                        <span className="px-2 bg-gray-100 text-gray-600 flex justify-center items-center text-[10px] font-bold rounded uppercase">
                          {task.type || 'General'}
                        </span>
                        <div className="flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-1 leading-tight line-through">
                        {task.title}
                      </h5>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {task.userImage ? (
                            <img
                              className="w-6 h-6 rounded-full object-cover border border-gray-200 opacity-50"
                              src={task.userImage}
                              alt={task.username || `User ${task.userID}`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.className = 'w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border border-gray-200 opacity-50';
                                e.target.parentElement.textContent = getUserInitials(task.username || `User ${task.userID}`);
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border border-gray-200 opacity-50">
                              {getUserInitials(task.username || `User ${task.userID}`)}
                            </div>
                          )}
                          <span className="text-xs text-gray-600 font-medium opacity-50">
                            {task.username || `User #${task.userID}`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 italic">
                          Completed
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Project Modal Form */}
      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 md:max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>
              <button
                onClick={closeProjectForm}
                className="w-10 h-10 flex justify-center items-center hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  name="projectTitle"
                  value={projectFormData.projectTitle}
                  onChange={handleProjectInputChange}
                  placeholder="Enter project title"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Project Description *
                </label>
                <textarea
                  name="projectDescription"
                  value={projectFormData.projectDescription}
                  onChange={handleProjectInputChange}
                  placeholder="Enter project description"
                  rows="3"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Project Type *
                </label>
                <select
                  name="projectType"
                  value={projectFormData.projectType}
                  onChange={handleProjectInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                  required
                >
                  <option value="project">Project</option>
                  <option value="urgent">Urgent</option>
                  <option value="priority">Priority</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal Form */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 md:max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={closeTaskForm}
                className="w-10 h-10 flex justify-center items-center hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={taskFormData.title}
                  onChange={handleTaskInputChange}
                  placeholder="Enter task title"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Task Description *
                </label>
                <textarea
                  name="description"
                  value={taskFormData.description}
                  onChange={handleTaskInputChange}
                  placeholder="Enter task description"
                  rows="3"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Task Type *
                </label>
                <select
                  name="type"
                  value={taskFormData.type}
                  onChange={handleTaskInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                  required
                >
                  <option value="">Select task type</option>
                  <option value="urgent">Urgent</option>
                  <option value="meeting">Meeting</option>
                  <option value="design">Design</option>
                  <option value="development">Development</option>
                  <option value="review">Review</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Task Time
                </label>
                <input
                  type="time"
                  name="time"
                  value={taskFormData.time}
                  onChange={handleTaskInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={taskFormData.status}
                  onChange={handleTaskInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                  required
                >
                  <option value="todo">To Do</option>
                  <option value="pending">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Assign To *
                </label>
                <select
                  name="userId"
                  value={taskFormData.userId}
                  onChange={handleTaskInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                  required
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} (ID: {user.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Project *
                </label>
                <select
                  name="projectId"
                  value={taskFormData.projectId}
                  onChange={handleTaskInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                  required
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectTitle}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                {editingTask ? 'Update Task' : 'Add Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectsPage;
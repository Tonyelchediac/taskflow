import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/userHeader";
import { getUser, authFetch } from "../utils/auth";

function UserPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    taskTitle: "",
    taskDescription: "",
    taskType: "",
    taskTime: "",
    projectId: ""
  });

  // Get user data and tasks from database using the ID from the JWT
  useEffect(() => {
    const decoded = getUser();

    if (!decoded) {
      navigate('/login');
      return;
    }

    const userId = decoded.userID;
    console.log("User ID from token:", userId);

    // Fetch user details from database
    authFetch(`https://taskflow-k90l.onrender.com/users/${userId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('User not found');
        }
        return res.json();
      })
      .then(user => {
        console.log("User data:", user);
        if (user && user.id) {
          setUserData(user);
          // Fetch user tasks after getting user data
          fetchUserTasks(userId);
          // Fetch user projects
          fetchUserProjects(userId);
          // Fetch all projects for dropdown
          fetchAllProjects();
        } else {
          navigate('/login');
        }
      })
      .catch(err => {
        console.error("Error fetching user:", err);
        navigate('/login');
      });
  }, [navigate]);

  // Fetch user tasks from API
  const fetchUserTasks = async (userId) => {
    try {
      const response = await authFetch(`https://taskflow-k90l.onrender.com/users/${userId}/tasks`);
      if (response.ok) {
        const tasks = await response.json();
        console.log("All tasks for user:", tasks);
        setUserTasks(tasks);
      } else {
        console.error("Failed to fetch tasks");
        setUserTasks([]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setUserTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user projects from API
  const fetchUserProjects = async (userId) => {
    try {
      const response = await authFetch(`https://taskflow-k90l.onrender.com/users/${userId}/projects`);
      if (response.ok) {
        const projects = await response.json();
        console.log("Projects for user:", projects);
        setUserProjects(projects);
      } else {
        console.error("Failed to fetch projects");
        setUserProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setUserProjects([]);
    }
  };

  // Fetch all projects for dropdown
  const fetchAllProjects = async () => {
    try {
      const response = await authFetch('https://taskflow-k90l.onrender.com/projects');
      if (response.ok) {
        const projects = await response.json();
        setAllProjects(projects);
      } else {
        console.error("Failed to fetch projects");
        setAllProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setAllProjects([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const decoded = getUser();
    if (!decoded) {
      alert("Please login again");
      return;
    }
    const userId = decoded.userID;

    const taskData = {
      title: formData.taskTitle,
      description: formData.taskDescription,
      type: formData.taskType,
      time: formData.taskTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userId: parseInt(userId),
      projectId: parseInt(formData.projectId) || 1
    };

    try {
      const response = await authFetch('https://taskflow-k90l.onrender.com/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        const newTask = await response.json();
        setUserTasks(prev => [newTask, ...prev]);
        setFormData({ taskTitle: "", taskDescription: "", taskType: "", taskTime: "", projectId: "" });
        setShowForm(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add task");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Error adding task. Please try again.");
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setFormData({ taskTitle: "", taskDescription: "", taskType: "", taskTime: "", projectId: "" });
  };

  const toggleTaskStatus = async (taskId) => {
    const task = userTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === "completed" ? "pending" : "completed";
    
    // Optimistically update UI
    setUserTasks(prev => 
      prev.map(t => 
        t.id === taskId 
          ? { ...t, status: newStatus }
          : t
      )
    );
    
    try {
      const response = await authFetch(`https://taskflow-k90l.onrender.com/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        // Revert on error
        setUserTasks(prev => 
          prev.map(t => 
            t.id === taskId 
              ? { ...t, status: task.status }
              : t
          )
        );
        alert("Failed to update task status");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      // Revert on error
      setUserTasks(prev => 
        prev.map(t => 
          t.id === taskId 
            ? { ...t, status: task.status }
            : t
        )
      );
      alert("Error updating task status");
    }
  };

  // Delete task function
  const deleteTask = async (taskId) => {
    const decoded = getUser();
    if (!decoded) {
      alert("Please login again");
      return;
    }
    const userId = decoded.userID;

    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await authFetch(`https://taskflow-k90l.onrender.com/tasks/${taskId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove task from state
        setUserTasks(prev => prev.filter(task => task.id !== taskId));
        alert("Task deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Error deleting task. Please try again.");
    }
  };

  // Get task type color
  const getTaskTypeColor = (type) => {
    const colors = {
      urgent: "bg-red-100 text-red-700",
      meeting: "bg-blue-100 text-blue-700",
      design: "bg-purple-100 text-purple-700",
      development: "bg-green-100 text-green-700",
      review: "bg-yellow-100 text-yellow-700",
      other: "bg-gray-100 text-gray-700"
    };
    return colors[type] || colors.other;
  };

  // Filter tasks: ONLY show tasks where status is 'pending'
  const pendingTasks = userTasks.filter(task => task.status === 'pending');
  
  // All other tasks for stats
  const completedTasks = userTasks.filter(task => task.status === 'completed').length;
  const totalTasks = userTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get unique projects count
  const uniqueProjects = new Set(userTasks.map(task => task.projectID)).size;

  console.log("Pending tasks:", pendingTasks);
  console.log("Total tasks:", totalTasks);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header page="./user" userData={userData} />
      <main className="p-5 md:px-margin-desktop py-xl mb-20">
        <section className="relative w-full h-80 rounded-xl overflow-hidden mb-xl card-shadow group">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCJgm4xQhmwfWDVNqCfwIvLCyLAvPPbYMVYg2OxDg9OBJ02_AeSWk57eeFMH2Cb1sSaHgXyERnbwbMXyGTk_v-zHXRbi0LTuu1HblQTYEm787bXmpeOAJY_h2mJ-GyJKnp1Qr74Jk8zFTQZ2p-cSDCcEii88Beo54AiZc3tADtgvXE1xmrsjri3q731Cx6LXMdk5sk5TseEkPClJS6XYYQ4p_MslI05rgWUCiFP3N7FSXm9xIFnXrCtoAF-9eiJp0z6ZBh1vmeRrcE')",
            }}
          ></div>
          <div className="absolute inset-0 bg-linear-to-r from-primary/60 to-transparent z-10"></div>
          <div className="relative z-20 h-full flex flex-col justify-center px-xl text-on-primary">
            <h1 className="font-display-lg text-display-lg mb-2">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userData?.username || 'User'}.
            </h1>
            <p className="font-body-lg text-body-lg opacity-90">
              "The secret of getting ahead is getting started." You have {pendingTasks.length} pending tasks today.
            </p>
          </div>
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <div className="lg:col-span-4 space-y-lg">
            <div className="bg-surface-container-lowest p-xl rounded-xl card-shadow flex flex-col items-center">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg w-full">
                Daily Goal
              </h3>
              <div className="relative flex items-center justify-center w-48 h-48 mb-lg">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-surface-container-high stroke-current"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="42"
                    strokeWidth="8"
                  ></circle>
                  <circle
                    className="text-primary stroke-current progress-ring__circle"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="42"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (completionPercentage / 100) * 264}
                    strokeLinecap="round"
                    strokeWidth="8"
                  ></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-display-lg text-display-lg text-primary">
                    {completionPercentage}%
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                    Complete
                  </span>
                </div>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant text-center">
                {completedTasks} of {totalTasks} tasks completed. {pendingTasks.length} pending!
              </p>
            </div>
            
            {/* User Info Card */}
            <div className="bg-surface-container-lowest p-xl rounded-xl card-shadow">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">
                User Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                  <span className="text-on-surface-variant">Username</span>
                  <span className="font-medium text-on-surface">{userData?.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                  <span className="text-on-surface-variant">Phone</span>
                  <span className="font-medium text-on-surface">{userData?.userPhone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                  <span className="text-on-surface-variant">Date of Birth</span>
                  <span className="font-medium text-on-surface">{userData?.dob ? new Date(userData.dob).toLocaleDateString() : 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-on-surface-variant">User ID</span>
                  <span className="font-medium text-on-surface">#{userData?.id}</span>
                </div>
              </div>
            </div>
            
            {/* Projects Streak Card */}
            <div className="bg-primary text-on-primary p-xl rounded-xl card-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                <span
                  className="material-symbols-outlined text-[120px]"
                  data-icon="folder"
                >
                  folder
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="material-symbols-outlined text-secondary-container"
                    data-icon="folder"
                  >
                    folder
                  </span>
                  <span className="font-label-md text-label-md uppercase tracking-widest text-primary-fixed">
                    Active Projects
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display-lg text-display-lg text-white">
                    {uniqueProjects}
                  </span>
                  <span className="font-headline-sm text-headline-sm text-primary-fixed-dim">
                    Projects
                  </span>
                </div>
                <p className="mt-4 font-body-md text-body-md opacity-80">
                  You are currently working on {uniqueProjects} project{uniqueProjects !== 1 ? 's' : ''} with {pendingTasks.length} pending tasks.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-md">
              <div className="bg-surface-container-low p-md rounded-xl card-shadow border border-outline-variant/30">
                <span
                  className="material-symbols-outlined text-secondary mb-2"
                  data-icon="check_circle"
                >
                  check_circle
                </span>
                <div className="font-headline-sm text-headline-sm text-on-surface">
                  {completedTasks}
                </div>
                <div className="font-label-md text-label-md text-on-surface-variant">
                  Done
                </div>
              </div>
              <div className="bg-surface-container-low p-md rounded-xl card-shadow border border-outline-variant/30">
                <span
                  className="material-symbols-outlined text-tertiary mb-2"
                  data-icon="schedule"
                >
                  schedule
                </span>
                <div className="font-headline-sm text-headline-sm text-on-surface">
                  {pendingTasks.length}
                </div>
                <div className="font-label-md text-label-md text-on-surface-variant">
                  Pending
                </div>
              </div>
            </div>
          </div>
          
          {/* Pending Tasks - Only shows tasks with status = 'pending' for this user */}
          <div
            id="dailyBrief"
            className="lg:col-span-8 bg-surface-container-lowest py-5 rounded-xl card-shadow"
          >
            <div className="flex justify-between items-center mb-xl px-5">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Pending Tasks
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Tasks assigned to you that are pending completion.
                </p>
              </div>
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 text-primary hover:text-on-primary-fixed font-label-md text-label-md"
              >
                Add Task
                <span
                  className="material-symbols-outlined text-sm"
                  data-icon="edit"
                >
                  edit
                </span>
              </button>
            </div>
            
            <div className="space-y-md px-5">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">
                    check_circle
                  </span>
                  <p className="mt-4 text-on-surface-variant">No pending tasks! Great job!</p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="task-card-border bg-surface flex items-center justify-between p-md rounded-lg card-shadow group hover:bg-surface-container transition-colors border-l-primary border-l-4"
                  >
                    <div className="flex items-center gap-lg flex-1">
                      <button 
                        onClick={() => toggleTaskStatus(task.id)}
                        className="w-8 h-8 rounded-full border-2 border-outline-variant group-hover:border-primary flex items-center justify-center transition-colors"
                      >
                        <span
                          className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 text-primary"
                          data-icon="check"
                        >
                          check
                        </span>
                      </button>
                      <div className="flex-1">
                        <h4 className="font-headline-sm text-headline-sm text-on-surface">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className={`${getTaskTypeColor(task.type)} text-label-md font-label-md px-2 py-0.5 rounded-full`}>
                            {task.type ? task.type.charAt(0).toUpperCase() + task.type.slice(1) : 'General'}
                          </span>
                          {task.time && (
                            <span className="flex items-center gap-1 text-on-surface-variant text-label-md">
                              <span
                                className="material-symbols-outlined text-sm"
                                data-icon="event"
                              >
                                event
                              </span>
                              {task.time}
                            </span>
                          )}
                          {task.projectID && (
                            <span className="flex items-center gap-1 text-on-surface-variant text-label-md">
                              <span
                                className="material-symbols-outlined text-sm"
                                data-icon="folder"
                              >
                                folder
                              </span>
                              Project #{task.projectID}
                            </span>
                          )}
                          <span className="bg-yellow-100 text-yellow-700 text-label-md font-label-md px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Delete button - visible on hover */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="ml-4 w-10 h-10 flex justify-center items-center text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete task"
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl p-8 md:max-w-2xl w-full mx-4 card-shadow animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Add New Task
              </h2>
              <button
                onClick={handleClose}
                className="w-10 h-10 flex justify-center items-center hover:bg-surface-container-highest rounded-full transition-colors"
                aria-label="Close form"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label 
                  htmlFor="taskTitle" 
                  className="font-label-md text-label-md text-on-surface-variant block mb-1"
                >
                  Task Title
                </label>
                <input
                  type="text"
                  id="taskTitle"
                  name="taskTitle"
                  value={formData.taskTitle}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
                  className="w-full px-4 py-3 bg-surface-container-high rounded-lg border border-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface font-body-md transition-all"
                  required
                />
              </div>

              <div>
                <label 
                  htmlFor="taskDescription" 
                  className="font-label-md text-label-md text-on-surface-variant block mb-1"
                >
                  Task Description
                </label>
                <textarea
                  id="taskDescription"
                  name="taskDescription"
                  value={formData.taskDescription}
                  onChange={handleInputChange}
                  placeholder="Enter task description"
                  rows="4"
                  className="w-full px-4 py-3 bg-surface-container-high rounded-lg border border-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface font-body-md transition-all resize-none"
                  required
                />
              </div>

              <div>
                <label 
                  htmlFor="taskType" 
                  className="font-label-md text-label-md text-on-surface-variant block mb-1"
                >
                  Task Type
                </label>
                <select
                  id="taskType"
                  name="taskType"
                  value={formData.taskType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-surface-container-high rounded-lg border border-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface font-body-md transition-all appearance-none"
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
                <label 
                  htmlFor="taskTime" 
                  className="font-label-md text-label-md text-on-surface-variant block mb-1"
                >
                  Task Time
                </label>
                <input
                  type="time"
                  id="taskTime"
                  name="taskTime"
                  value={formData.taskTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-surface-container-high rounded-lg border border-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface font-body-md transition-all"
                />
              </div>

              <div>
                <label 
                  htmlFor="projectId" 
                  className="font-label-md text-label-md text-on-surface-variant block mb-1"
                >
                  Project
                </label>
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-surface-container-high rounded-lg border border-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface font-body-md transition-all appearance-none"
                >
                  <option value="">Select a project</option>
                  {allProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectTitle}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-6 px-6 py-3 bg-primary text-on-primary font-headline-sm text-headline-sm rounded-lg hover:bg-primary-fixed hover:text-on-primary-fixed transition-all active:scale-95"
              >
                Add Task
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default UserPage;
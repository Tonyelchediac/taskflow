import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/userHeader";
import { getUser, authFetch } from "../utils/auth";

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const decoded = getUser();
    if (!decoded) {
      navigate('/login');
      return;
    }
    const userId = decoded.userID;

    // Get user data
    authFetch(`https://taskflow-k90l.onrender.com/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUserData(data);
      })
      .catch(err => console.log(err));

    // Fetch all projects
    authFetch('https://taskflow-k90l.onrender.com/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setFilteredProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0]);
          fetchProjectDetails(data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  }, [navigate]);

  const fetchProjectDetails = (projectId) => {
    authFetch(`https://taskflow-k90l.onrender.com/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setSelectedProjectData(data);
      })
      .catch(err => console.log(err));
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    fetchProjectDetails(project.id);
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
      }
    }
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

  // Get user display for a task
  const getUserDisplay = (task) => {
    if (task.username) {
      return task.username;
    }
    return `User #${task.userID}`;
  };

  // Get user avatar for a task
  const getUserAvatar = (task) => {
    if (task.userImage) {
      return task.userImage;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Loading projects...</p>
        </div>
      </div>
    );
  }

  const projectTasks = selectedProjectData?.tasks || [];
  const projectUsers = getProjectUsers(projectTasks, selectedProjectData?.users || []);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;

  // Map statuses to columns
  const todoTasks = getTasksByStatus(projectTasks, 'todo');
  const inProgressTasks = getTasksByStatus(projectTasks, 'pending');
  const doneTasks = getTasksByStatus(projectTasks, 'completed');

  return (
    <>
      <Header page="./user/projects" userData={userData} />
      <main className="flex flex-col md:flex-row h-screen">
        {/* aside content */}
        <aside className="w-full md:w-80 lg:w-96 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 space-y-4">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Active Projects
            </h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-xl border-none focus:ring-2 focus:ring-primary text-body-md"
                placeholder="Search projects by title, description, or type..."
                type="text"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-5 space-y-md p-xl">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl">search_off</span>
                <p className="mt-2 text-sm">No projects found matching your search.</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                return (
                  <div
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`bg-surface-container-low p-md rounded-xl active-project-card shadow-sm cursor-pointer hover:bg-surface-container transition-all group ${
                      selectedProject?.id === project.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-sm">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${getProjectTypeColor(project.projectType)}`}>
                        {project.projectType || 'General'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {project.projectTitle}
                    </h3>
                    <p className="text-body-md text-on-surface-variant line-clamp-2 mb-md">
                      {project.projectDescription}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* main content */}
        <section className="flex-1 flex flex-col bg-background">
          <div className="p-lg md:px-xl border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <nav className="flex items-center gap-xs text-label-md text-outline mb-xs">
                <span>Projects</span>
                <span className="material-symbols-outlined text-sm">
                  chevron_right
                </span>
                <span className="text-primary font-bold">
                  {selectedProject?.projectTitle || 'Select a Project'}
                </span>
              </nav>
              <h2 className="font-display-lg text-display-lg text-on-surface">
                Task Overview
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {projectUsers.slice(0, 4).map((user) => (
                  <div
                    key={user.id}
                    className="w-8 h-8 rounded-full border-2 border-surface-container-lowest overflow-hidden"
                    title={user.username}
                  >
                    {user.userImage ? (
                      <img
                        className="w-full h-full object-cover"
                        src={user.userImage}
                        alt={user.username}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.className = 'w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-primary flex items-center justify-center text-white text-xs font-bold';
                          e.target.parentElement.textContent = getUserInitials(user.username);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                        {getUserInitials(user.username)}
                      </div>
                    )}
                  </div>
                ))}
                {projectUsers.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container text-xs flex items-center justify-center border-2 border-surface-container-lowest font-bold">
                    +{projectUsers.length - 4}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">
                  assignment
                </span>
                <span className="text-label-md">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
          </div>
          <div className="p-5 pb-25 md:p-xl flex gap-lg flex-1 flex-col md:flex-col lg:flex-row md:overflow-x-auto custom-scrollbar">
            {/* To-Do Column - status: todo */}
            <div className="min-w-80 flex-1 flex flex-col gap-md">
              <div className="flex items-center justify-between px-xs">
                <div className="flex items-center gap-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    To-Do
                  </h4>
                  <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-label-md font-bold text-on-surface-variant">
                    {todoTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-md">
                {todoTasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-body-md">
                    No tasks to do
                  </div>
                ) : (
                  todoTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-surface-container-lowest p-md rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border-l-4 border-gray-400 hover:-translate-y-1 transition-transform cursor-pointer group"
                    >
                      <div className="flex justify-between mb-sm">
                        <span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-bold rounded uppercase">
                          {task.type || 'General'}
                        </span>
                      </div>
                      <h5 className="font-headline-sm text-headline-sm text-on-surface mb-xs leading-tight">
                        {task.title}
                      </h5>
                      <p className="text-body-md text-on-surface-variant mb-md line-clamp-2">
                        {task.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {/* User avatar and name for the task */}
                          <div className="flex items-center gap-2">
                            {task.userImage ? (
                              <img
                                className="w-6 h-6 rounded-full object-cover border border-surface-container-lowest"
                                src={task.userImage}
                                alt={task.username || `User ${task.userID}`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.parentElement.className = 'w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border border-surface-container-lowest';
                                  e.target.parentElement.textContent = getUserInitials(task.username || `User ${task.userID}`);
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border border-surface-container-lowest">
                                {getUserInitials(task.username || `User ${task.userID}`)}
                              </div>
                            )}
                            <span className="text-xs text-on-surface-variant font-medium">
                              {task.username || `User #${task.userID}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-xs text-outline text-label-md">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>
                          <span>{task.time || 'No time set'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* In Progress Column - status: pending */}
            <div className="min-w-80 flex-1 flex flex-col gap-md">
              <div className="flex items-center justify-between px-xs">
                <div className="flex items-center gap-sm">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    In Progress
                  </h4>
                  <span className="bg-primary-container px-2 py-0.5 rounded-full text-label-md font-bold text-on-primary-container">
                    {inProgressTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-md">
                {inProgressTasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-body-md">
                    No tasks in progress
                  </div>
                ) : (
                  inProgressTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-surface-container-lowest p-md rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border-l-4 border-primary hover:-translate-y-1 transition-transform cursor-pointer group"
                    >
                      <div className="flex justify-between mb-sm">
                        <span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] font-bold rounded uppercase">
                          {task.type || 'General'}
                        </span>
                      </div>
                      <h5 className="font-headline-sm text-headline-sm text-on-surface mb-xs leading-tight">
                        {task.title}
                      </h5>
                      <p className="text-body-md text-on-surface-variant mb-md line-clamp-2">
                        {task.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {/* User avatar and name for the task */}
                          <div className="flex items-center gap-2">
                            {task.userImage ? (
                              <img
                                className="w-6 h-6 rounded-full object-cover border border-surface-container-lowest"
                                src={task.userImage}
                                alt={task.username || `User ${task.userID}`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.parentElement.className = 'w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border border-surface-container-lowest';
                                  e.target.parentElement.textContent = getUserInitials(task.username || `User ${task.userID}`);
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border border-surface-container-lowest">
                                {getUserInitials(task.username || `User ${task.userID}`)}
                              </div>
                            )}
                            <span className="text-xs text-on-surface-variant font-medium">
                              {task.username || `User #${task.userID}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-xs text-outline text-label-md">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>
                          <span>{task.time || 'No time set'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Done Column - status: completed */}
            <div className="min-w-80 flex-1 flex flex-col gap-md">
              <div className="flex items-center justify-between px-xs">
                <div className="flex items-center gap-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    Done
                  </h4>
                  <span className="bg-secondary-container px-2 py-0.5 rounded-full text-label-md font-bold text-on-secondary-container">
                    {doneTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-md">
                {doneTasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-body-md">
                    No completed tasks
                  </div>
                ) : (
                  doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-surface-container-lowest p-md rounded-xl shadow-sm border-l-4 border-secondary grayscale-[0.5] hover:grayscale-0 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between mb-sm">
                        <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase">
                          {task.type || 'General'}
                        </span>
                      </div>
                      <h5 className="font-headline-sm text-headline-sm text-on-surface mb-xs leading-tight line-through">
                        {task.title}
                      </h5>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {/* User avatar and name for the task */}
                          <div className="flex items-center gap-2">
                            {task.userImage ? (
                              <img
                                className="w-6 h-6 rounded-full object-cover border border-surface-container-lowest opacity-50"
                                src={task.userImage}
                                alt={task.username || `User ${task.userID}`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.parentElement.className = 'w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border border-surface-container-lowest opacity-50';
                                  e.target.parentElement.textContent = getUserInitials(task.username || `User ${task.userID}`);
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border border-surface-container-lowest opacity-50">
                                {getUserInitials(task.username || `User ${task.userID}`)}
                              </div>
                            )}
                            <span className="text-xs text-on-surface-variant font-medium opacity-50">
                              {task.username || `User #${task.userID}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-xs text-outline text-label-md">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>
                          <span>{task.time || 'No time set'}</span>
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
    </>
  );
}

export default ProjectsPage;
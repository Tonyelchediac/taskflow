import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/adminHeader";
import { getUser, authFetch } from "../utils/auth";

function AdminAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({
    alertTitle: "",
    alertDescription: "",
    alertFile: "",
    alertStatus: "general",
    userAlert: ""
  });

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

    // Fetch all alerts (admin)
    fetchAllAlerts();
  }, [navigate]);

  const fetchAllAlerts = async () => {
    try {
      const response = await authFetch('https://taskflow-9hgr.onrender.com/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      } else {
        console.error("Failed to fetch alerts");
        setAlerts([]);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
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

    const alertData = {
      alertTitle: formData.alertTitle.trim(),
      alertDescription: formData.alertDescription.trim(),
      alertStatus: formData.alertStatus,
      userAlert: parseInt(formData.userAlert) || 0
    };

    // Only add alertFile if it has a value
    if (formData.alertFile && formData.alertFile.trim() !== '') {
      alertData.alertFile = formData.alertFile.trim();
    }
    
    try {
      const response = await authFetch('https://taskflow-9hgr.onrender.com/alerts', {
        method: 'POST',
        body: JSON.stringify(alertData),
      });
      
      if (response.ok) {
        const newAlert = await response.json();
        setAlerts(prev => [newAlert, ...prev]);
        alert("Alert added successfully!");
        setFormData({ alertTitle: "", alertDescription: "", alertFile: "", alertStatus: "general", userAlert: "" });
        setShowForm(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add alert");
      }
    } catch (error) {
      console.error("Error adding alert:", error);
      alert("Error adding alert. Please try again.");
    }
  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      alertTitle: alert.alertTitle,
      alertDescription: alert.alertDescription,
      alertFile: alert.alertFile || "",
      alertStatus: alert.alertStatus,
      userAlert: alert.userAlert.toString()
    });
    setShowForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const decoded = getUser();
    if (!decoded) {
      alert("Please login again");
      return;
    }

    const alertData = {
      alertTitle: formData.alertTitle.trim(),
      alertDescription: formData.alertDescription.trim(),
      alertStatus: formData.alertStatus,
      userAlert: parseInt(formData.userAlert) || 0
    };

    if (formData.alertFile && formData.alertFile.trim() !== '') {
      alertData.alertFile = formData.alertFile.trim();
    }

    try {
      const response = await authFetch(`https://taskflow-9hgr.onrender.com/alerts/${editingAlert.id}`, {
        method: 'PUT',
        body: JSON.stringify(alertData),
      });
      
      if (response.ok) {
        const updatedAlert = await response.json();
        setAlerts(prev => prev.map(alert => 
          alert.id === updatedAlert.id ? updatedAlert : alert
        ));
        alert("Alert updated successfully!");
        setFormData({ alertTitle: "", alertDescription: "", alertFile: "", alertStatus: "general", userAlert: "" });
        setShowForm(false);
        setEditingAlert(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update alert");
      }
    } catch (error) {
      console.error("Error updating alert:", error);
      alert("Error updating alert. Please try again.");
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAlert(null);
    setFormData({ alertTitle: "", alertDescription: "", alertFile: "", alertStatus: "general", userAlert: "" });
  };

  const deleteAlert = async (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await authFetch(`https://taskflow-9hgr.onrender.com/alerts/${alertId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        alert("Alert deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete alert");
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
      alert("Error deleting alert. Please try again.");
    }
  };

  const getAlertStatusColor = (status) => {
    const colors = {
      urgent: "border-red-500 bg-red-50 text-red-700",
      general: "border-blue-500 bg-blue-50 text-blue-700",
      info: "border-green-500 bg-green-50 text-green-700"
    };
    return colors[status] || colors.general;
  };

  const getAlertStatusBgColor = (status) => {
    const colors = {
      urgent: "bg-red-100 text-red-700",
      general: "bg-blue-100 text-blue-700",
      info: "bg-green-100 text-green-700"
    };
    return colors[status] || colors.general;
  };

  const getAlertIcon = (status) => {
    const icons = {
      urgent: "warning",
      general: "notifications",
      info: "info"
    };
    return icons[status] || "notifications";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header page="./admin/alerts" userData={userData} />
      <main className="p-5 mb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-xl gap-lg">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Manage Alerts
            </h2>
            <p className="text-lg text-gray-600 mt-1">
              Create, edit, and manage system alerts for all users.
            </p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Alert
          </button>
        </div>

        {/* Alerts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">File</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <span className="material-symbols-outlined text-6xl text-gray-300">
                        notifications_off
                      </span>
                      <p className="mt-4 text-gray-500">No alerts found</p>
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{alert.alertTitle}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{alert.alertDescription}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${getAlertStatusBgColor(alert.alertStatus)} text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider`}>
                          {alert.alertStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {alert.userAlert === 0 ? 'Public' : `User #${alert.userAlert}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {alert.alertFile ? (
                          <a 
                            href={alert.alertFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">link</span>
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">No file</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(alert)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit alert"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete alert"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-blue-500">notifications</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Public Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{alerts.filter(a => a.userAlert === 0).length}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-green-500">public</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Private Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{alerts.filter(a => a.userAlert !== 0).length}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-purple-500">lock</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Form - Create/Edit */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 md:max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAlert ? 'Edit Alert' : 'Create New Alert'}
              </h2>
              <button
                onClick={handleClose}
                className="w-10 h-10 flex justify-center items-center hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close form"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={editingAlert ? handleUpdate : handleSubmit} className="space-y-4">
              <div>
                <label 
                  htmlFor="alertTitle" 
                  className="text-sm font-medium text-gray-700 block mb-1"
                >
                  Alert Title *
                </label>
                <input
                  type="text"
                  id="alertTitle"
                  name="alertTitle"
                  value={formData.alertTitle}
                  onChange={handleInputChange}
                  placeholder="Enter alert title"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                  required
                />
              </div>

              <div>
                <label 
                  htmlFor="alertDescription" 
                  className="text-sm font-medium text-gray-700 block mb-1"
                >
                  Alert Description *
                </label>
                <textarea
                  id="alertDescription"
                  name="alertDescription"
                  value={formData.alertDescription}
                  onChange={handleInputChange}
                  placeholder="Enter alert description"
                  rows="4"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all resize-none"
                  required
                />
              </div>

              <div>
                <label 
                  htmlFor="alertStatus" 
                  className="text-sm font-medium text-gray-700 block mb-1"
                >
                  Alert Status *
                </label>
                <select
                  id="alertStatus"
                  name="alertStatus"
                  value={formData.alertStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                  required
                >
                  <option value="general">General</option>
                  <option value="urgent">Urgent</option>
                  <option value="info">Information</option>
                </select>
              </div>

              <div>
                <label 
                  htmlFor="alertFile" 
                  className="text-sm font-medium text-gray-700 block mb-1"
                >
                  File URL (Optional)
                </label>
                <input
                  type="url"
                  id="alertFile"
                  name="alertFile"
                  value={formData.alertFile}
                  onChange={handleInputChange}
                  placeholder="https://example.com/file.pdf"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                />
              </div>

              <div>
                <label 
                  htmlFor="userAlert" 
                  className="text-sm font-medium text-gray-700 block mb-1"
                >
                  User ID (0 = Public, or specific User ID)
                </label>
                <input
                  type="number"
                  id="userAlert"
                  name="userAlert"
                  value={formData.userAlert}
                  onChange={handleInputChange}
                  placeholder="Enter user ID (0 for public)"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter 0 for public alerts visible to all users, or a specific user ID for private alerts.
                </p>
              </div>

              <button
                type="submit"
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                {editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminAlerts;
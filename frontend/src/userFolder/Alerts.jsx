import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/userHeader";
import { getUser, authFetch } from "../utils/auth";

function UserAlert() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Fetch alerts for this user (private + public, excluding dismissed)
    fetchAlerts(userId);
  }, [navigate]);

  const fetchAlerts = async (userId) => {
    try {
      const response = await authFetch(`https://taskflow-9hgr.onrender.com/users/${userId}/alerts`);
      if (response.ok) {
        const data = await response.json();
        // Filter out dismissed alerts
        const undismissedAlerts = data.filter(alert => alert.isDismissed === 0);
        setAlerts(undismissedAlerts);
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

  // Dismiss alert (hides from user's view, not deleted from database)
  const dismissAlert = async (alertId) => {
    const decoded = getUser();
    if (!decoded) {
      alert("Please login again");
      return;
    }
    const userId = decoded.userID;

    try {
      const response = await authFetch(`https://taskflow-9hgr.onrender.com/alerts/${alertId}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ userId: parseInt(userId) }),
      });
      
      if (response.ok) {
        // Remove alert from local state
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        // Update the alert count in the header by refreshing
        window.dispatchEvent(new Event('alertDismissed'));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to dismiss alert");
      }
    } catch (error) {
      console.error("Error dismissing alert:", error);
      alert("Error dismissing alert. Please try again.");
    }
  };

  const getAlertStatusColor = (status) => {
    const colors = {
      urgent: "border-error bg-error-container text-error",
      general: "border-primary bg-surface-variant text-primary",
      info: "border-secondary bg-secondary-container text-secondary"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header page="./user/alerts" userData={userData} />
      <main className="p-5 mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-xl gap-lg">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">
              Notifications
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
              Stay updated on your team's progress and upcoming deadlines.
            </p>
          </div>
        </div>

        {/* Alerts List - Shows only undismissed alerts */}
        <div className="space-y-md">
          {alerts.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-lowest rounded-xl">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">
                notifications_off
              </span>
              <p className="mt-4 text-on-surface-variant">No notifications</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`group bg-surface-container-lowest p-lg rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border-l-4 ${getAlertStatusColor(alert.alertStatus)} flex gap-lg hover:bg-surface-container-low transition-all`}
              >
                <div className={`w-12 h-12 rounded-xl ${getAlertStatusColor(alert.alertStatus)} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined">
                    {getAlertIcon(alert.alertStatus)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="mb-xs">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className="font-headline-sm text-headline-sm">
                        {alert.alertTitle}
                      </span>
                      <span className={`${getAlertStatusColor(alert.alertStatus)} text-[10px] font-bold px-sm py-0.5 rounded-full uppercase tracking-widest`}>
                        {alert.alertStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {alert.userAlert === 0 ? 'Public' : `Private (User #${alert.userAlert})`}
                      </span>
                    </div>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                    {alert.alertDescription}
                  </p>
                  {alert.alertFile && (
                    <div className="bg-surface-container-low p-md rounded-lg flex items-center justify-between mb-3">
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                          attachment
                        </span>
                        <span className="font-label-md text-label-md text-on-surface truncate max-w-xs">
                          {alert.alertFile.split('/').pop() || alert.alertFile}
                        </span>
                      </div>
                      <a 
                        href={alert.alertFile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="cursor-pointer material-symbols-outlined text-primary hover:text-primary-fixed"
                      >
                        open_in_new
                      </a>
                    </div>
                  )}
                  {/* Dismiss button - hides alert from user's view */}
                  <button 
                    onClick={() => dismissAlert(alert.id)}
                    className="text-on-surface-variant hover:text-primary font-label-md text-label-md hover:underline transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}

export default UserAlert;
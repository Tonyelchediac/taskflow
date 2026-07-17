import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Header from "../components/adminHeader";
import { getUser, authFetch } from "../utils/auth";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    usermail: "",
    password: "",
    username: "",
    status: "ur",
    userImage: "",
    userPhone: "",
    dob: ""
  });

  useEffect(() => {
    const decoded = getUser();
    if (!decoded) {
      navigate('/login');
      return;
    }
    const userId = decoded.userID;

    // Get admin user data
    authFetch(`https://taskflow-k90l.onrender.com/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUserData(data);
      })
      .catch(err => console.log(err));

    // Fetch all users
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const response = await authFetch('https://taskflow-k90l.onrender.com/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error("Failed to fetch users");
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
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

    // Format the date properly
    const formattedDob = formData.dob || null;
    
    // Handle phone number - ensure it's a valid number or 0
    const phoneNumber = formData.userPhone && formData.userPhone.trim() !== "" 
      ? parseInt(formData.userPhone.trim()) 
      : 0;

    const userData = {
      usermail: formData.usermail.trim(),
      password: formData.password,
      username: formData.username.trim(),
      status: formData.status,
      userImage: formData.userImage.trim() || "",
      userPhone: phoneNumber,
      dob: formattedDob
    };
    
    console.log("Sending user data:", userData);
    
    try {
      const url = editingUser
        ? `https://taskflow-k90l.onrender.com/admin/users/${editingUser.userID}`
        : 'https://taskflow-k90l.onrender.com/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method: method,
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        const user = await response.json();
        if (editingUser) {
          setUsers(prev => prev.map(u => u.userID === user.userID ? user : u));
          alert("User updated successfully!");
        } else {
          setUsers(prev => [user, ...prev]);
          alert("User created successfully!");
        }
        setFormData({ usermail: "", password: "", username: "", status: "ur", userImage: "", userPhone: "", dob: "" });
        setShowForm(false);
        setEditingUser(null);
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        alert(errorData.error || "Failed to save user");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Error saving user. Please try again.");
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    // Format the date for the input field (YYYY-MM-DD)
    let formattedDob = "";
    if (user.dob) {
      const date = new Date(user.dob);
      formattedDob = date.toISOString().split('T')[0];
    }
    
    setFormData({
      usermail: user.usermail,
      password: "",
      username: user.username, // Now using user.username directly
      status: user.status,
      userImage: user.userImage || "",
      userPhone: user.userPhone?.toString() || "",
      dob: formattedDob
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await authFetch(`https://taskflow-k90l.onrender.com/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.userID !== userId));
        alert("User deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user. Please try again.");
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ usermail: "", password: "", username: "", status: "ur", userImage: "", userPhone: "", dob: "" });
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.usermail?.toLowerCase().includes(search) ||
      user.userID?.toString().includes(search)
    );
  });

  const getStatusBadge = (status) => {
    if (status === 'ad') {
      return <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700">Admin</span>;
    }
    return <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">User</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header page="./admin/users" userData={userData} />
      <main className=" mx-auto px-4 md:px-6 py-8 mb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-600">Manage all users and administrators in the system.</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add User
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <span className="material-symbols-outlined text-6xl text-gray-300">people</span>
                      <p className="mt-4 text-gray-500">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.userID} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{user.userID}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.userImage ? (
                            <img
                              src={user.userImage}
                              alt={user.username}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${user.username}&background=6366f1&color=fff&size=40`;
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                              {(user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.usermail}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.userPhone || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(user.userID)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete user"
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

        {/* User Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-blue-500">people</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admins</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'ad').length}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-purple-500">admin_panel_settings</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Regular Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'ur').length}</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-green-500">person</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Form - Create/Edit User */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 md:max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={handleClose}
                className="w-10 h-10 flex justify-center items-center hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close form"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="usermail"
                    value={formData.usermail}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {editingUser ? 'Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Role *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all appearance-none"
                    required
                  >
                    <option value="ur">User</option>
                    <option value="ad">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="userPhone"
                    value={formData.userPhone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  name="userImage"
                  value={formData.userImage}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "taskflow_dev_fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

const app = express();
app.use(cors());
app.use(express.json());

// ============ JWT MIDDLEWARE ============
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userID, status, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Check if user is an admin ('ad')
function authorizeAdmin(req, res, next) {
  if (req.user && req.user.status === "ad") {
    next();
  } else {
    return res.status(403).json({ error: "Forbidden. Admin access required." });
  }
}

const db = mysql.createConnection({
  host: "sql201.hstn.me",
  user: "mseet_42431595",
  password: "L8nqCAwV7kQS",
  database: "mseet_42431595_taskflow",
});

app.get("/", (req, res) => {
  return res.json("From Backend Side");
});

app.get("/users", (req, res) => {
  const sql = "SELECT * FROM logindetails";
  db.query(sql, (err, data) => {
    if (err) return res.json("Error");
    return res.json(data);
  });
});

// Login endpoint - issues a JWT on successful authentication
app.post("/login", async (req, res) => {
  const { usermail, password } = req.body;

  if (!usermail || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM logindetails WHERE usermail = ?";
  db.query(sql, [usermail], async (err, data) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (data.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const user = data[0];
    let passwordMatch = false;

    try {
      // Check if password is hashed (starts with $2b$)
      if (user.password && user.password.startsWith("$2b$")) {
        passwordMatch = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password
        passwordMatch = password === user.password;

        // If plain text matches, upgrade to hash
        if (passwordMatch) {
          const hashedPassword = await bcrypt.hash(password, 10);
          db.query(
            "UPDATE logindetails SET password = ? WHERE userID = ?",
            [hashedPassword, user.userID],
            (updateErr) => {
              if (updateErr)
                console.error("Error updating password hash:", updateErr);
            },
          );
        }
      }

      if (passwordMatch) {
        // Sign a JWT with the user's ID and role
        const token = jwt.sign(
          { userID: user.userID, status: user.status },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );
        return res.json({ success: true, token });
      } else {
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });
});

// Get user details from usersdetails table
app.get("/users/:id", authenticateToken, (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT * FROM usersdetails WHERE id = ?";
  db.query(sql, [userId], (err, data) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (data.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(data[0]);
  });
});

// Get tasks for a specific user
app.get("/users/:id/tasks", authenticateToken, (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT * FROM tasks WHERE userID = ? ORDER BY id DESC";
  db.query(sql, [userId], (err, data) => {
    if (err) {
      console.error("Error fetching tasks:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Get projects for a specific user
app.get("/users/:id/projects", authenticateToken, (req, res) => {
  const userId = req.params.id;
  const sql =
    "SELECT DISTINCT p.* FROM projects p INNER JOIN tasks t ON p.id = t.projectID WHERE t.userID = ?";
  db.query(sql, [userId], (err, data) => {
    if (err) {
      console.error("Error fetching user projects:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Get alerts for a specific user
app.get("/users/:id/alerts", authenticateToken, (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT a.*, 
      CASE WHEN da.id IS NOT NULL THEN 1 ELSE 0 END as isDismissed
    FROM alerts a
    LEFT JOIN user_dismissed_alerts da ON a.id = da.alertID AND da.userID = ?
    WHERE (a.userAlert = ? OR a.userAlert = 0)
    ORDER BY a.id DESC
  `;
  db.query(sql, [userId, userId], (err, data) => {
    if (err) {
      console.error("Error fetching alerts:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Get only undismissed alerts count for a user
app.get("/users/:id/alerts/count", authenticateToken, (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT COUNT(*) as count
    FROM alerts a
    LEFT JOIN user_dismissed_alerts da ON a.id = da.alertID AND da.userID = ?
    WHERE (a.userAlert = ? OR a.userAlert = 0)
      AND da.id IS NULL
  `;
  db.query(sql, [userId, userId], (err, data) => {
    if (err) {
      console.error("Error fetching alert count:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data[0]);
  });
});

// Dismiss an alert
app.post("/alerts/:id/dismiss", authenticateToken, (req, res) => {
  const alertId = req.params.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const sql =
    "INSERT INTO user_dismissed_alerts (userID, alertID) VALUES (?, ?)";
  db.query(sql, [userId, alertId], (err, result) => {
    if (err) {
      console.error("Error dismissing alert:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json({ message: "Alert dismissed successfully" });
  });
});

// Get all alerts (admin)
app.get("/alerts", authenticateToken, authorizeAdmin, (req, res) => {
  const sql = "SELECT * FROM alerts ORDER BY id DESC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error fetching alerts:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Create a new alert
app.post("/alerts", authenticateToken, authorizeAdmin, (req, res) => {
  const { alertTitle, alertDescription, alertFile, alertStatus, userAlert } =
    req.body;

  if (!alertTitle || !alertDescription || !alertStatus) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const fileValue =
    alertFile && alertFile.trim() !== "" ? alertFile.trim() : null;

  const sql =
    "INSERT INTO alerts (alertTitle, alertDescription, alertFile, alertStatus, userAlert) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sql,
    [alertTitle, alertDescription, fileValue, alertStatus, userAlert || 0],
    (err, result) => {
      if (err) {
        console.error("Error creating alert:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      const getSql = "SELECT * FROM alerts WHERE id = ?";
      db.query(getSql, [result.insertId], (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        return res.status(201).json(data[0]);
      });
    },
  );
});

// Update an alert
app.put("/alerts/:id", authenticateToken, authorizeAdmin, (req, res) => {
  const alertId = req.params.id;
  const { alertTitle, alertDescription, alertFile, alertStatus, userAlert } =
    req.body;

  if (!alertTitle || !alertDescription || !alertStatus) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const fileValue =
    alertFile && alertFile.trim() !== "" ? alertFile.trim() : null;

  const sql =
    "UPDATE alerts SET alertTitle = ?, alertDescription = ?, alertFile = ?, alertStatus = ?, userAlert = ? WHERE id = ?";
  db.query(
    sql,
    [
      alertTitle,
      alertDescription,
      fileValue,
      alertStatus,
      userAlert || 0,
      alertId,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating alert:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Alert not found" });
      }

      const getSql = "SELECT * FROM alerts WHERE id = ?";
      db.query(getSql, [alertId], (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        return res.json(data[0]);
      });
    },
  );
});

// Delete an alert
app.delete("/alerts/:id", authenticateToken, authorizeAdmin, (req, res) => {
  const alertId = req.params.id;

  const deleteDismissedSql =
    "DELETE FROM user_dismissed_alerts WHERE alertID = ?";
  db.query(deleteDismissedSql, [alertId], (err) => {
    if (err) {
      console.error("Error deleting dismissed alerts:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const deleteSql = "DELETE FROM alerts WHERE id = ?";
    db.query(deleteSql, [alertId], (err, result) => {
      if (err) {
        console.error("Error deleting alert:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Alert not found" });
      }
      return res.json({ message: "Alert deleted successfully" });
    });
  });
});

// Get all projects
app.get("/projects", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM projects ORDER BY id DESC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error fetching projects:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Create a new project
app.post("/projects", authenticateToken, authorizeAdmin, (req, res) => {
  const { projectTitle, projectDescription, projectType } = req.body;

  if (!projectTitle || !projectDescription || !projectType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "INSERT INTO projects (projectTitle, projectDescription, projectType) VALUES (?, ?, ?)";
  db.query(
    sql,
    [projectTitle, projectDescription, projectType],
    (err, result) => {
      if (err) {
        console.error("Error creating project:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const getSql = "SELECT * FROM projects WHERE id = ?";
      db.query(getSql, [result.insertId], (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        return res.status(201).json(data[0]);
      });
    },
  );
});

// Update a project
app.put("/projects/:id", authenticateToken, authorizeAdmin, (req, res) => {
  const projectId = req.params.id;
  const { projectTitle, projectDescription, projectType } = req.body;

  if (!projectTitle || !projectDescription || !projectType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "UPDATE projects SET projectTitle = ?, projectDescription = ?, projectType = ? WHERE id = ?";
  db.query(
    sql,
    [projectTitle, projectDescription, projectType, projectId],
    (err, result) => {
      if (err) {
        console.error("Error updating project:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      const getSql = "SELECT * FROM projects WHERE id = ?";
      db.query(getSql, [projectId], (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        return res.json(data[0]);
      });
    },
  );
});

// Delete a project
app.delete("/projects/:id", authenticateToken, authorizeAdmin, (req, res) => {
  const projectId = req.params.id;

  const deleteTasksSql = "DELETE FROM tasks WHERE projectID = ?";
  db.query(deleteTasksSql, [projectId], (err) => {
    if (err) {
      console.error("Error deleting project tasks:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const deleteSql = "DELETE FROM projects WHERE id = ?";
    db.query(deleteSql, [projectId], (err, result) => {
      if (err) {
        console.error("Error deleting project:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json({ message: "Project deleted successfully" });
    });
  });
});

// Get project health
app.get("/projects/:id/health", authenticateToken, (req, res) => {
  const projectId = req.params.id;

  const sql = `
    SELECT 
      COUNT(*) as totalTasks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTasks,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingTasks,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todoTasks
    FROM tasks 
    WHERE projectID = ?
  `;
  db.query(sql, [projectId], (err, data) => {
    if (err) {
      console.error("Error fetching project health:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data[0]);
  });
});

// Get a specific project with its tasks and user details
app.get("/projects/:id", authenticateToken, (req, res) => {
  const projectId = req.params.id;

  const projectSql = "SELECT * FROM projects WHERE id = ?";
  db.query(projectSql, [projectId], (err, projectData) => {
    if (err) {
      console.error("Error fetching project:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (projectData.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const tasksSql = `
      SELECT t.*, u.username, u.userImage 
      FROM tasks t 
      LEFT JOIN usersdetails u ON t.userID = u.id 
      WHERE t.projectID = ? 
      ORDER BY t.id DESC
    `;
    db.query(tasksSql, [projectId], (err, tasksData) => {
      if (err) {
        console.error("Error fetching tasks:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const userIds = [...new Set(tasksData.map((task) => task.userID))];
      let usersData = [];

      if (userIds.length > 0) {
        const usersSql = `SELECT * FROM usersdetails WHERE id IN (${userIds.join(",")})`;
        db.query(usersSql, (err, users) => {
          if (err) {
            console.error("Error fetching users:", err);
          }
          return res.json({
            project: projectData[0],
            tasks: tasksData,
            users: users || [],
          });
        });
      } else {
        return res.json({
          project: projectData[0],
          tasks: tasksData,
          users: [],
        });
      }
    });
  });
});

// Create a new task
app.post("/tasks", authenticateToken, (req, res) => {
  const { title, description, type, time, userId, projectId, status } =
    req.body;

  if (!title || !description || !type || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Use the status from the request, default to 'pending' if not provided
  const taskStatus = status || "pending";

  const sql =
    "INSERT INTO tasks (projectID, userID, title, description, type, time, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(
    sql,
    [
      projectId || 1,
      userId,
      title,
      description,
      type,
      time ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      taskStatus,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating task:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const getSql = "SELECT * FROM tasks WHERE id = ?";
      db.query(getSql, [result.insertId], (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        return res.status(201).json(data[0]);
      });
    },
  );
});

// Get all users from usersdetails table
app.get("/usersdetails", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM usersdetails ORDER BY username";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Update a task
app.put("/tasks/:id", authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const { title, description, type, time, status, userId, projectId } =
    req.body;

  if (!title || !description || !type || !userId || !projectId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "UPDATE tasks SET title = ?, description = ?, type = ?, time = ?, status = ?, userID = ?, projectID = ? WHERE id = ?";
  db.query(
    sql,
    [title, description, type, time, status, userId, projectId, taskId],
    (err, result) => {
      if (err) {
        console.error("Error updating task:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      const getSql = "SELECT * FROM tasks WHERE id = ?";
      db.query(getSql, [taskId], (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        return res.json(data[0]);
      });
    },
  );
});

// Get all tasks (for admin dashboard)
app.get("/tasks", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM tasks ORDER BY id DESC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error fetching tasks:", err);
      return res.status(500).json({ error: "Database error" });
    }
    return res.json(data);
  });
});

// Update task status
app.patch("/tasks/:id/status", authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body;

  const sql = "UPDATE tasks SET status = ? WHERE id = ?";
  db.query(sql, [status, taskId], (err, result) => {
    if (err) {
      console.error("Error updating task:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json({ message: "Task updated successfully" });
  });
});

// DELETE a task - Admin can delete any task, users can only delete their own
app.delete("/tasks/:id", authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.query.userId;
  const userStatus = req.query.userStatus;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  // First check if the user is an admin
  const checkUserSql = "SELECT status FROM logindetails WHERE userID = ?";
  db.query(checkUserSql, [userId], (err, userData) => {
    if (err) {
      console.error("Error checking user status:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (userData.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const isAdmin = userData[0].status === "ad";

    // Check if the task exists
    const checkSql = "SELECT userID FROM tasks WHERE id = ?";
    db.query(checkSql, [taskId], (err, taskData) => {
      if (err) {
        console.error("Error checking task:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (taskData.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      // If not admin, check if the task belongs to the user
      if (!isAdmin && taskData[0].userID !== parseInt(userId)) {
        return res
          .status(403)
          .json({ error: "You don't have permission to delete this task" });
      }

      // Delete the task (admin can delete any, user can only delete their own)
      const deleteSql = isAdmin
        ? "DELETE FROM tasks WHERE id = ?"
        : "DELETE FROM tasks WHERE id = ? AND userID = ?";

      const deleteParams = isAdmin ? [taskId] : [taskId, userId];

      db.query(deleteSql, deleteParams, (err, result) => {
        if (err) {
          console.error("Error deleting task:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Task not found" });
        }
        return res.json({ message: "Task deleted successfully" });
      });
    });
  });
});
// ============ ADMIN USER MANAGEMENT ENDPOINTS ============

// Get all users with their details
app.get("/admin/users", authenticateToken, authorizeAdmin, (req, res) => {
  const sql = `
    SELECT l.userID, l.usermail, l.password, l.status, 
           u.username, u.userImage, u.userPhone, u.dob 
    FROM logindetails l 
    LEFT JOIN usersdetails u ON l.userID = u.id 
    ORDER BY l.userID DESC
  `;
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    return res.json(data);
  });
});

// Create a new user with hashed password
app.post("/admin/users", authenticateToken, authorizeAdmin, async (req, res) => {
  const { usermail, password, status, username, userImage, userPhone, dob } =
    req.body;

  if (!usermail || !password || !status || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const getMaxIdSql = "SELECT MAX(userID) as maxId FROM logindetails";
    db.query(getMaxIdSql, (err, result) => {
      if (err) {
        console.error("Error getting max ID:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      const newUserId = (result[0].maxId || 1000) + 1;

      const loginSql =
        "INSERT INTO logindetails (userID, usermail, password, status) VALUES (?, ?, ?, ?)";
      db.query(
        loginSql,
        [newUserId, usermail, hashedPassword, status],
        (err) => {
          if (err) {
            console.error("Error creating login details:", err);
            return res
              .status(500)
              .json({ error: "Database error: " + err.message });
          }

          const phoneValue =
            userPhone && userPhone.toString().trim() !== ""
              ? parseInt(userPhone)
              : 0;
          const dobValue = dob && dob.trim() !== "" ? dob : null;
          const imageValue =
            userImage && userImage.trim() !== "" ? userImage : "";

          const detailsSql =
            "INSERT INTO usersdetails (id, username, userImage, userPhone, dob) VALUES (?, ?, ?, ?, ?)";
          db.query(
            detailsSql,
            [newUserId, username, imageValue, phoneValue, dobValue],
            (err) => {
              if (err) {
                console.error("Error creating user details:", err);
                return res
                  .status(500)
                  .json({ error: "Database error: " + err.message });
              }

              const getSql = `
            SELECT l.userID, l.usermail, l.password, l.status, 
                   u.username, u.userImage, u.userPhone, u.dob 
            FROM logindetails l 
            LEFT JOIN usersdetails u ON l.userID = u.id 
            WHERE l.userID = ?
          `;
              db.query(getSql, [newUserId], (err, data) => {
                if (err) {
                  console.error("Error fetching new user:", err);
                  return res
                    .status(500)
                    .json({ error: "Database error: " + err.message });
                }
                return res.status(201).json(data[0]);
              });
            },
          );
        },
      );
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    return res.status(500).json({ error: "Error processing password" });
  }
});

// Update a user
app.put("/admin/users/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  const userId = req.params.id;
  const { usermail, password, status, username, userImage, userPhone, dob } =
    req.body;

  if (!usermail || !status || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let loginSql = "UPDATE logindetails SET usermail = ?, status = ?";
    const loginParams = [usermail, status];

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      loginSql += ", password = ?";
      loginParams.push(hashedPassword);
    }
    loginSql += " WHERE userID = ?";
    loginParams.push(userId);

    db.query(loginSql, loginParams, (err) => {
      if (err) {
        console.error("Error updating login details:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      const detailsSql =
        "UPDATE usersdetails SET username = ?, userImage = ?, userPhone = ?, dob = ? WHERE id = ?";
      db.query(
        detailsSql,
        [username, userImage || "", userPhone || 0, dob || null, userId],
        (err) => {
          if (err) {
            console.error("Error updating user details:", err);
            return res
              .status(500)
              .json({ error: "Database error: " + err.message });
          }

          const getSql = `
          SELECT l.userID, l.usermail, l.password, l.status, 
                 u.username, u.userImage, u.userPhone, u.dob 
          FROM logindetails l 
          LEFT JOIN usersdetails u ON l.userID = u.id 
          WHERE l.userID = ?
        `;
          db.query(getSql, [userId], (err, data) => {
            if (err) {
              console.error("Error fetching updated user:", err);
              return res
                .status(500)
                .json({ error: "Database error: " + err.message });
            }
            return res.json(data[0]);
          });
        },
      );
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    return res.status(500).json({ error: "Error processing password" });
  }
});

// Delete a user
app.delete("/admin/users/:id", authenticateToken, authorizeAdmin, (req, res) => {
  const userId = req.params.id;

  const detailsSql = "DELETE FROM usersdetails WHERE id = ?";
  db.query(detailsSql, [userId], (err) => {
    if (err) {
      console.error("Error deleting user details:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    const loginSql = "DELETE FROM logindetails WHERE userID = ?";
    db.query(loginSql, [userId], (err, result) => {
      if (err) {
        console.error("Error deleting login details:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({ message: "User deleted successfully" });
    });
  });
});

app.listen(8081, () => {
  console.log("Server listening on port 8081");
});

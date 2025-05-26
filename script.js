// Application state
        let reminders = [];
        let currentTheme = 'light';

        // Initialize application
        document.addEventListener('DOMContentLoaded', function() {
            loadReminders();
            setMinDateTime();
            updateStats();
            renderReminders();
        });

        // Theme toggle functionality
        function toggleTheme() {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            
            const themeIcon = document.getElementById('theme-icon');
            const themeText = document.getElementById('theme-text');
            
            if (currentTheme === 'dark') {
                themeIcon.textContent = '☀️';
                themeText.textContent = 'Light Mode';
            } else {
                themeIcon.textContent = '🌙';
                themeText.textContent = 'Dark Mode';
            }
            
            // Save theme preference
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem('healthremind-theme', currentTheme);
            }
        }

        // Load saved theme
        if (typeof(Storage) !== "undefined") {
            const savedTheme = localStorage.getItem('healthremind-theme');
            if (savedTheme) {
                currentTheme = savedTheme;
                document.documentElement.setAttribute('data-theme', currentTheme);
                if (currentTheme === 'dark') {
                    document.getElementById('theme-icon').textContent = '☀️';
                    document.getElementById('theme-text').textContent = 'Light Mode';
                }
            }
        }

        // Set minimum date/time to current
        function setMinDateTime() {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('followup-date').min = now.toISOString().slice(0, 16);
        }

        // Form submission
        document.getElementById('reminder-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                id: Date.now(),
                patientName: document.getElementById('patient-name').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                followupDate: new Date(document.getElementById('followup-date').value),
                reminderMethod: document.getElementById('reminder-method').value,
                reminderTime: parseInt(document.getElementById('reminder-time').value),
                doctor: document.getElementById('doctor').value,
                notes: document.getElementById('notes').value,
                status: 'pending',
                createdAt: new Date()
            };

            reminders.push(formData);
            saveReminders();
            updateStats();
            renderReminders();
            
            // Reset form
            this.reset();
            setMinDateTime();
            
            showNotification('Reminder scheduled successfully!', 'success');
        });

        // Save reminders to localStorage
        function saveReminders() {
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem('healthremind-data', JSON.stringify(reminders));
            }
        }

        // Load reminders from localStorage
        function loadReminders() {
            if (typeof(Storage) !== "undefined") {
                const saved = localStorage.getItem('healthremind-data');
                if (saved) {
                    reminders = JSON.parse(saved).map(r => ({
                        ...r,
                        followupDate: new Date(r.followupDate),
                        createdAt: new Date(r.createdAt)
                    }));
                }
            }
        }

        // Update statistics
        function updateStats() {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            document.getElementById('total-patients').textContent = reminders.length;
            document.getElementById('pending-reminders').textContent = reminders.filter(r => r.status === 'pending').length;
            document.getElementById('sent-today').textContent = reminders.filter(r => 
                r.status === 'sent' && new Date(r.sentAt || r.createdAt) >= today
            ).length;
            document.getElementById('overdue-count').textContent = reminders.filter(r => 
                r.status === 'pending' && r.followupDate < now
            ).length;
        }

        // Render reminders list
        function renderReminders() {
            const container = document.getElementById('reminders-container');
            const now = new Date();
            
            if (reminders.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No reminders scheduled yet.</p>';
                return;
            }

            // Sort by followup date
            const sortedReminders = [...reminders].sort((a, b) => a.followupDate - b.followupDate);

            container.innerHTML = sortedReminders.map(reminder => {
                const isOverdue = reminder.status === 'pending' && reminder.followupDate < now;
                const statusClass = isOverdue ? 'status-overdue' : `status-${reminder.status}`;
                const statusText = isOverdue ? 'Overdue' : reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1);

                return `
                    <div class="reminder-item">
                        <div class="reminder-header">
                            <div class="patient-name">${reminder.patientName}</div>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="reminder-date">
                            📅 ${reminder.followupDate.toLocaleDateString()} at ${reminder.followupDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.5rem 0;">
                            📱 ${reminder.reminderMethod.toUpperCase()} • ${reminder.phone}
                            ${reminder.doctor ? ` • ${reminder.doctor}` : ''}
                        </div>
                        ${reminder.notes ? `<div style="font-size: 0.9rem; color: var(--text-secondary);">📝 ${reminder.notes}</div>` : ''}
                        <div class="reminder-actions">
                            ${reminder.status === 'pending' ? 
                                `<button class="btn btn-success" onclick="sendReminder(${reminder.id})" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                                    📤 Send Now
                                </button>` : ''
                            }
                            <button class="btn btn-danger" onclick="deleteReminder(${reminder.id})" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Send reminder function
        function sendReminder(id) {
            const reminder = reminders.find(r => r.id === id);
            if (!reminder) return;

            const modalBody = document.getElementById('modal-body');
            modalBody.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <strong>Patient:</strong> ${reminder.patientName}<br>
                    <strong>Method:</strong> ${reminder.reminderMethod.toUpperCase()}<br>
                    <strong>Contact:</strong> ${reminder.phone}<br>
                    <strong>Appointment:</strong> ${reminder.followupDate.toLocaleDateString()} at ${reminder.followupDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <strong>Message Preview:</strong><br>
                    <em>Hi ${reminder.patientName}, this is a reminder about your follow-up appointment on ${reminder.followupDate.toLocaleDateString()} at ${reminder.followupDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}${reminder.doctor ? ` with ${reminder.doctor}` : ''}. Please confirm your attendance. Thank you!</em>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-success" onclick="confirmSend(${id})">
                        ✅ Confirm Send
                    </button>
                    <button class="btn" onclick="closeModal()" style="background: var(--bg-tertiary); color: var(--text-primary);">
                        Cancel
                    </button>
                </div>
            `;

            document.getElementById('send-modal').classList.add('show');
        }

        // Confirm send reminder
        function confirmSend(id) {
            const reminder = reminders.find(r => r.id === id);
            if (reminder) {
                reminder.status = 'sent';
                reminder.sentAt = new Date();
                saveReminders();
                updateStats();
                renderReminders();
                closeModal();
                showNotification(`Reminder sent to ${reminder.patientName} via ${reminder.reminderMethod.toUpperCase()}!`, 'success');
            }
        }

        // Delete reminder
        function deleteReminder(id) {
            if (confirm('Are you sure you want to delete this reminder?')) {
                reminders = reminders.filter(r => r.id !== id);
                saveReminders();
                updateStats();
                renderReminders();
                showNotification('Reminder deleted successfully!', 'success');
            }
        }

        // Modal functions
        function openModal() {
            document.getElementById('send-modal').classList.add('show');
        }
        function closeModal() {
            document.getElementById('send-modal').classList.remove('show');
        }

        // Show notification
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            const notificationText = document.getElementById('notification-text');
            
            notificationText.textContent = message;
            notification.className = `notification ${type} show`;
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // Auto-check for reminders that need to be sent
        setInterval(() => {
            const now = new Date();
            reminders.forEach(reminder => {
                if (reminder.status === 'pending') {
                    const reminderTime = new Date(reminder.followupDate.getTime() - (reminder.reminderTime * 60 * 60 * 1000));
                    if (now >= reminderTime && now < reminder.followupDate) {
                        // In a real application, this would trigger the actual sending
                        console.log(`Time to send reminder to ${reminder.patientName}`);
                    }
                }
            });
            updateStats();
            renderReminders();
        }, 60000); // Check every minute

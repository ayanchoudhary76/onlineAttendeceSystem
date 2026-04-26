import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTeachers } from '../../hooks/useTeachers';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminUsers = () => {
  const { token } = useAuth();
  React.useEffect(() => { document.title = 'User Management — SmartAttend'; }, []);
  const { data: allUsers, loading: usersLoading, error: usersError, refetch: refetchUsers } = useTeachers();
  // Note: useTeachers fetches role=teacher. We'll fetch all users separately below.
  const [users, setUsers] = useState([]);
  const [usersLoadingState, setUsersLoadingState] = useState(true);
  const [usersErrorState, setUsersErrorState] = useState(null);

  // File upload state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { success: [], failed: [] }
  const [uploadError, setUploadError] = useState(null);

  // Create user state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'student', sectionId: '' });
  const [createErrors, setCreateErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Delete user state
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, name, role }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Sections list for the create-user modal
  const [sections, setSections] = useState([]);
  useEffect(() => {
    fetch(`${BASE_URL}/api/admin/sections`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSections).catch(() => {});
  }, [token]);

  // Fetch all users on mount
  React.useEffect(() => {
    fetchAllUsers();
  }, [token]);

  const fetchAllUsers = async () => {
    setUsersLoadingState(true);
    setUsersErrorState(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setUsersErrorState(err.message);
    } finally {
      setUsersLoadingState(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadError('Please select a .csv file');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file || null);
    setUploadError(null);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${BASE_URL}/api/admin/users/bulk`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setUploadResult(data);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refresh the user list
      fetchAllUsers();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');
      setDeleteTarget(null);
      fetchAllUsers();
      setSuccessBanner('User deleted successfully');
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Create user handlers ────────────────────────────────────────────────
  const resetCreateForm = () => {
    setCreateForm({ name: '', email: '', password: '', role: 'student', sectionId: '' });
    setCreateErrors({});
    setCreateError(null);
  };

  const openCreateModal = () => { resetCreateForm(); setCreateModalOpen(true); };
  const closeCreateModal = () => { setCreateModalOpen(false); resetCreateForm(); };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const errs = {};
    if (!createForm.name.trim()) errs.name = 'Name is required';
    if (!createForm.email.trim()) errs.email = 'Email is required';
    else if (!createForm.email.includes('@')) errs.email = 'Enter a valid email address';
    if (!createForm.password) errs.password = 'Password is required';
    else if (createForm.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (createForm.role === 'student' && !createForm.sectionId) errs.sectionId = 'Section is required for students';

    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs);
      return;
    }
    setCreateErrors({});
    setCreateError(null);
    setCreateLoading(true);

    try {
      const body = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        ...(createForm.role === 'student' && createForm.sectionId ? { sectionId: createForm.sectionId } : {})
      };

      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.status === 409) {
        setCreateError('Email already exists');
        return;
      }
      if (!res.ok) throw new Error(data.message || 'Failed to create user');

      closeCreateModal();
      fetchAllUsers();
      setSuccessBanner('User created successfully');
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Table config for existing users
  const userColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'roleBadge' },
    { header: 'Section', accessor: 'sectionName' },
  ];

  const usersTableData = users.map(u => ({
    ...u,
    roleBadge: u.role,
    sectionName: u.sectionId?.name || '-'
  }));

  const userActions = [
    {
      label: 'Delete',
      onClick: (row) => { setDeleteError(null); setDeleteTarget(row); },
      className: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
    }
  ];

  // Table config for failed rows
  const failedColumns = [
    { header: 'Name', accessor: 'row.name' },
    { header: 'Email', accessor: 'row.email' },
    { header: 'Role', accessor: 'row.role' },
    { header: 'Reason', accessor: 'reason' },
  ];

  const sectionOptions = sections.map(s => ({ label: s.name, value: s._id }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
        <p className="text-gray-500 dark:text-gray-400">Bulk import users via CSV or create accounts individually.</p>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm font-medium">
          {successBanner}
        </div>
      )}

      {/* ── CSV Upload Section ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Bulk Import</h3>

        {/* CSV Format Guide */}
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected CSV format:</p>
          <code className="block text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre">name,email,password,role,sectionCode
Alice Johnson,alice@example.com,Pass123!,student,CSE-3A
Prof. Smith,smith@example.com,Pass456!,teacher,</code>
          <ul className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>• <strong>role</strong> must be <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">student</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">teacher</code>, or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">admin</code></li>
            <li>• <strong>sectionCode</strong> must match an existing section name (required for students, optional for teachers)</li>
            <li>• Duplicate emails will be reported as failures</li>
          </ul>
        </div>

        {/* File Picker + Upload Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label className="flex-grow w-full sm:w-auto">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {selectedFile ? selectedFile.name : 'Choose a CSV file...'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <Button
            variant="primary"
            onClick={handleUpload}
            loading={uploading}
            disabled={!selectedFile}
          >
            Upload & Import
          </Button>
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {uploadError}
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="space-y-4">
            {/* Success Summary */}
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl">✅</div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">
                  {uploadResult.success?.length || 0} users imported successfully
                </p>
                {uploadResult.failed?.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {uploadResult.failed.length} rows failed — see details below
                  </p>
                )}
              </div>
            </div>

            {/* Failed Rows */}
            {uploadResult.failed?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Failed Rows</h4>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/50">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-b border-red-100 dark:border-red-900/30">Name</th>
                        <th className="px-4 py-3 font-semibold border-b border-red-100 dark:border-red-900/30">Email</th>
                        <th className="px-4 py-3 font-semibold border-b border-red-100 dark:border-red-900/30">Role</th>
                        <th className="px-4 py-3 font-semibold border-b border-red-100 dark:border-red-900/30">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50 dark:divide-red-900/20">
                      {uploadResult.failed.map((item, idx) => (
                        <tr key={idx} className="hover:bg-red-50/50 dark:hover:bg-red-900/10">
                          <td className="px-4 py-3">{item.row?.name || '-'}</td>
                          <td className="px-4 py-3">{item.row?.email || '-'}</td>
                          <td className="px-4 py-3">{item.row?.role || '-'}</td>
                          <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Existing Users Table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            All Users <span className="text-sm font-normal text-gray-400">({users.length})</span>
          </h3>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={fetchAllUsers} className="text-sm">
              Refresh
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              + Create User
            </Button>
          </div>
        </div>

        {usersLoadingState ? (
          <div className="text-center py-10 text-gray-500">Loading users...</div>
        ) : usersErrorState ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{usersErrorState}</p>
            <Button variant="secondary" onClick={fetchAllUsers}>Retry</Button>
          </div>
        ) : (
          <DataTable
            columns={userColumns}
            data={usersTableData}
            actions={userActions}
            emptyMessage="No users found. Import some via CSV above."
          />
        )}
      </div>

      {/* ── Create User Modal ───────────────────────────────────────────── */}
      <Modal isOpen={createModalOpen} onClose={closeCreateModal} title="Create User">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <FormInput
            label="Full Name"
            name="name"
            value={createForm.name}
            onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder="e.g. Alice Johnson"
            error={createErrors.name}
            required
          />
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            value={createForm.email}
            onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="e.g. alice@example.com"
            error={createErrors.email}
            required
          />
          <FormInput
            label="Password"
            name="password"
            type="password"
            value={createForm.password}
            onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="Minimum 6 characters"
            error={createErrors.password}
            required
          />
          <FormSelect
            label="Role"
            name="role"
            value={createForm.role}
            onChange={e => setCreateForm({ ...createForm, role: e.target.value, sectionId: '' })}
            options={[
              { label: 'Student', value: 'student' },
              { label: 'Teacher', value: 'teacher' },
            ]}
            required
          />
          {createForm.role === 'student' && (
            <FormSelect
              label="Section"
              name="sectionId"
              value={createForm.sectionId}
              onChange={e => setCreateForm({ ...createForm, sectionId: e.target.value })}
              options={sectionOptions}
              error={createErrors.sectionId}
              required
            />
          )}

          {createError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={closeCreateModal}>Cancel</Button>
            <Button variant="primary" type="submit" loading={createLoading}>Create User</Button>
          </div>
        </form>
      </Modal>
      {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete User">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteTarget?.name}</strong>?{' '}
            <span className="text-gray-500">({deleteTarget?.role})</span>
            {' '}This action cannot be undone.
          </p>
          {deleteError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteLoading}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;

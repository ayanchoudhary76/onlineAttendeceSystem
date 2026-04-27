import React, { useState, useEffect } from 'react';
import { useSections } from '../../hooks/useSections';
import { useSubjects } from '../../hooks/useSubjects';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import SectionForm from './SectionForm';
import SubjectForm from './SubjectForm';
import ManageSection from './ManageSection';

const RowSkeleton = () => (
  <div className="divide-y divide-gray-100 dark:divide-gray-700">
    {[1,2,3].map(i => (
      <div key={i} className="flex gap-6 px-6 py-4">
        <Skeleton height="0.875rem" width="30%" />
        <Skeleton height="0.875rem" width="25%" />
        <Skeleton height="0.875rem" width="15%" />
      </div>
    ))}
  </div>
);

const AdminStructure = () => {
  useEffect(() => { document.title = 'Academic Structure — SmartAttend'; }, []);
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' or 'subjects'
  
  const { data: sectionsData, loading: sectionsLoading, error: sectionsError, refetch: refetchSections } = useSections();
  const { data: subjectsData, loading: subjectsLoading, error: subjectsError, refetch: refetchSubjects } = useSubjects();

  // Modal States
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [manageSectionTarget, setManageSectionTarget] = useState(null); // stores the section object if managing
  const [editSubjectTarget, setEditSubjectTarget] = useState(null); // stores subject to edit

  // Table Configs
  const sectionColumns = [
    { header: 'Section Name', accessor: 'name' },
    { header: 'Department', accessor: 'department' },
    { header: 'Semester', accessor: 'semester' },
  ];

  const sectionActions = [
    { 
      label: 'Manage', 
      variant: 'secondary', 
      onClick: (section) => setManageSectionTarget(section) 
    },
    // { label: 'Delete', variant: 'danger', onClick: (section) => console.log('Delete', section) }
  ];

  const subjectColumns = [
    { header: 'Subject Name', accessor: 'name' },
    { header: 'Course Code', accessor: 'code' },
    { header: 'Assigned Teacher', accessor: (row) => row.teacherId?.name || <span className="text-gray-400 text-xs italic">Unassigned</span> },
  ];

  const subjectActions = [
    {
      label: 'Assign Teacher',
      variant: 'secondary',
      onClick: (subject) => { setEditSubjectTarget(subject); setIsSubjectModalOpen(true); }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Structure</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your college's sections and subjects.</p>
        </div>
        <div className="mt-4 md:mt-0">
          {activeTab === 'sections' ? (
            <Button onClick={() => setIsSectionModalOpen(true)}>+ Add Section</Button>
          ) : (
            <Button onClick={() => setIsSubjectModalOpen(true)}>+ Add Subject</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sections')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sections'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
            }`}
          >
            Sections
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'subjects'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
            }`}
          >
            Subjects
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'sections' && (
          <div>
            {sectionsLoading ? (
              <RowSkeleton />
            ) : sectionsError ? (
              <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{sectionsError}</p>
                <Button variant="secondary" onClick={refetchSections}>Retry</Button>
              </div>
            ) : (
              <DataTable
                columns={sectionColumns}
                data={sectionsData}
                actions={sectionActions}
                emptyMessage="No sections yet. Add your first section."
              />
            )}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div>
            {subjectsLoading ? (
              <RowSkeleton />
            ) : subjectsError ? (
              <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center gap-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{subjectsError}</p>
                <Button variant="secondary" onClick={refetchSubjects}>Retry</Button>
              </div>
            ) : (
              <DataTable
                columns={subjectColumns}
                data={subjectsData}
                actions={subjectActions}
                emptyMessage="No subjects yet. Add your first subject."
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isSectionModalOpen} 
        onClose={() => setIsSectionModalOpen(false)}
        title="Add New Section"
      >
        <SectionForm 
          onSuccess={() => {
            setIsSectionModalOpen(false);
            refetchSections();
          }} 
          onCancel={() => setIsSectionModalOpen(false)}
        />
      </Modal>

      <Modal 
        isOpen={isSubjectModalOpen} 
        onClose={() => { setIsSubjectModalOpen(false); setEditSubjectTarget(null); }}
        title={editSubjectTarget ? 'Assign Teacher to Subject' : 'Add New Subject'}
      >
        <SubjectForm 
          subject={editSubjectTarget}
          onSuccess={() => {
            setIsSubjectModalOpen(false);
            setEditSubjectTarget(null);
            refetchSubjects();
          }} 
          onCancel={() => { setIsSubjectModalOpen(false); setEditSubjectTarget(null); }}
        />
      </Modal>

      <Modal 
        isOpen={manageSectionTarget !== null} 
        onClose={() => setManageSectionTarget(null)}
        title="Manage Section Users"
      >
        {manageSectionTarget && (
          <ManageSection 
            section={manageSectionTarget} 
            onClose={() => setManageSectionTarget(null)} 
          />
        )}
      </Modal>

    </div>
  );
};

export default AdminStructure;

import {
  DocumentMagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns'; // Import date-fns functions
import { r2rClient } from 'r2r-js';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { DeleteButton } from '@/components/ChatDemo/deleteButton';
import UpdateButtonContainer from '@/components/ChatDemo/UpdateButtonContainer';
import { UploadButton } from '@/components/ChatDemo/upload';
import DocumentInfoDialog from '@/components/ChatDemo/utils/documentDialogInfo';
import { getFilteredAndSortedDocuments } from '@/components/ChatDemo/utils/documentSorter';
import Layout from '@/components/Layout';
import Pagination from '@/components/ui/altPagination';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from '@/components/ui/MenuBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { usePipelineInfo } from '@/context/PipelineInfo';
import { DocumentFilterCriteria, DocumentInfoType } from '@/types';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TRANSITION_DELAY = 500; // 0.5 seconds

const Index: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [documents, setDocuments] = useState<DocumentInfoType[]>([]);
  const [filterCriteria, setFilterCriteria] = useState<DocumentFilterCriteria>({
    sort: 'title',
    order: 'asc',
  });
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const documentsPerPage = 10;

  const { pipeline, isLoading: isPipelineLoading } = usePipelineInfo();
  const userId = null;

  const fetchDocuments = useCallback(
    async (client: r2rClient, retryCount = 0) => {
      try {
        const data = await client.documentsOverview([], []);
        setDocuments(data.results);
        setIsTransitioning(true);
        setTimeout(() => {
          setIsLoading(false);
          setIsTransitioning(false);
        }, TRANSITION_DELAY);
        setError(null);
      } catch (error) {
        console.error('Error fetching documents:', error);
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => fetchDocuments(client, retryCount + 1), RETRY_DELAY);
        } else {
          setIsLoading(false);
          setError('Failed to fetch documents. Please try again later.');
        }
      }
    },
    []
  );

  useEffect(() => {
    if (pipeline?.deploymentUrl) {
      const client = new r2rClient(pipeline?.deploymentUrl);
      fetchDocuments(client);
    }
  }, [pipeline?.deploymentUrl, isPipelineLoading, fetchDocuments]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const filteredAndSortedDocuments = useMemo(
    () => getFilteredAndSortedDocuments(documents, filterCriteria),
    [documents, filterCriteria]
  );

  const totalPages = Math.ceil(
    (filteredAndSortedDocuments.length || 0) / documentsPerPage
  );
  const currentDocuments = filteredAndSortedDocuments.slice(
    (currentPage - 1) * documentsPerPage,
    currentPage * documentsPerPage
  );

  useEffect(() => {
    if (
      currentPage >
      Math.ceil(filteredAndSortedDocuments.length / documentsPerPage)
    ) {
      setCurrentPage(
        Math.max(
          1,
          Math.ceil(filteredAndSortedDocuments.length / documentsPerPage)
        )
      );
    }
  }, [filteredAndSortedDocuments.length, currentPage, documentsPerPage]);

  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [isDocumentInfoDialogOpen, setIsDocumentInfoDialogOpen] =
    useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: 'Document ID copied to clipboard',
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const copyUserToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: 'User ID copied to clipboard',
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const formatDate = (dateString: string) => {
    if (
      dateString !== null &&
      dateString !== undefined &&
      dateString.length > 0
    ) {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy HH:mm'); // Format: "Jun 5, 2024 16:26"
    } else {
      return 'N/A';
    }
  };

  const renderTableRows = () => {
    const rows = [];

    if (isLoading) {
      rows.push(
        <tr key="loading">
          <td colSpan={8} className="px-4 py-2 text-center text-white">
            <div className="flex justify-center items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span>Loading documents...</span>
            </div>
          </td>
        </tr>
      );
    } else if (error) {
      rows.push(
        <tr key="error">
          <td colSpan={8} className="px-4 py-2 text-center text-white">
            {error}
          </td>
        </tr>
      );
    } else if (documents.length === 0) {
      rows.push(
        <tr key="no-docs">
          <td colSpan={8} className="px-4 py-2 text-center text-white">
            No documents available. Upload a document to get started.
          </td>
        </tr>
      );
    } else {
      currentDocuments.forEach((doc) => {
        rows.push(
          <tr key={doc.document_id}>
            <td className="px-4 py-2 text-white">
              <div className="flex items-center">
                <Checkbox
                  checked={selectedDocumentIds.includes(doc.document_id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedDocumentIds([
                        ...selectedDocumentIds,
                        doc.document_id,
                      ]);
                    } else {
                      setSelectedDocumentIds(
                        selectedDocumentIds.filter(
                          (id) => id !== doc.document_id
                        )
                      );
                    }
                  }}
                />
                <div
                  className="overflow-x-auto whitespace-nowrap ml-4"
                  style={{ width: '125px' }}
                >
                  {/* {doc.document_id} */}
                  <div
                    className="overflow-x-auto whitespace-nowrap ml-4 cursor-pointer flex items-center"
                    style={{ width: '125px' }}
                    onClick={() => copyToClipboard(doc.document_id)}
                  >
                    {doc.document_id.substring(0, 4)}...
                    {doc.document_id.substring(
                      doc.document_id.length - 4,
                      doc.document_id.length
                    )}
                    {/* <ClipboardCopyIcon className="h-4 w-4 ml-2" /> */}
                  </div>
                </div>
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div
                className="overflow-x-auto whitespace-nowrap cursor-pointer"
                style={{ width: '100px' }}
                onClick={() => copyUserToClipboard(doc.user_id)}
              >
                {doc.user_id
                  ? `${doc.user_id.substring(0, 4)}...${doc.user_id.substring(doc.user_id.length - 4, doc.user_id.length)}`
                  : 'N/A'}
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div
                className="overflow-x-auto whitespace-nowrap"
                style={{ width: '175px' }}
              >
                {doc.title || 'N/A'}
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div
                className="overflow-x-auto whitespace-nowrap"
                style={{ width: '75px' }}
              >
                {doc.version}
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div
                className="overflow-x-auto whitespace-nowrap"
                style={{ width: '175px' }}
              >
                {formatDate(doc.updated_at)}
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div
                className="overflow-x-auto whitespace-nowrap"
                style={{ width: '75px' }}
              >
                {(doc.size_in_bytes / 1e6).toFixed(2)}
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div className="flex justify-center items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <UpdateButtonContainer
                        apiUrl={pipeline?.deploymentUrl || ''}
                        documentId={doc.document_id}
                        onUpdateSuccess={() =>
                          pipeline?.deploymentUrl &&
                          fetchDocuments(new r2rClient(pipeline?.deploymentUrl))
                        }
                        showToast={toast}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Update Document</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        onClick={() => {
                          setSelectedDocumentId(doc.document_id);
                          setIsDocumentInfoDialogOpen(true);
                        }}
                        className="info-button hover:bg-blue-700 bg-blue-500 text-white font-bold rounded flex items-center justify-center"
                      >
                        <DocumentMagnifyingGlassIcon className="h-8 w-8" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Document Chunks</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </td>
            <td className="px-4 py-2 text-white">
              <div
                className="overflow-x-auto whitespace-nowrap"
                style={{ width: '100px' }}
              >
                {doc.updated_at}
              </div>
            </td>
          </tr>
        );
      });
    }

    // Add empty rows to maintain table height
    const emptyRowsCount = documentsPerPage - rows.length;
    for (let i = 0; i < emptyRowsCount; i++) {
      rows.push(
        <tr key={`empty-${i}`} style={{ height: '50px' }}>
          <td colSpan={8} className="px-4 py-2 text-center text-white">
            <div
              className="flex justify-center items-center space-x-2"
              style={{ width: '1160px' }}
            >
              &nbsp;
            </div>
          </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <Layout>
      <main className="max-w-7xl flex flex-col min-h-screen container">
        <div className="mt-[5rem] sm:mt-[5rem]">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-blue-500 pl-4 pt-8">
              Documents
            </h3>
            <div className="flex items-center space-x-4">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger className="p-2">
                    <FunnelIcon className="h-5 w-5" />
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem
                      onClick={() =>
                        setFilterCriteria((prev) => ({
                          ...prev,
                          sort: 'title',
                        }))
                      }
                    >
                      Sort by Title
                    </MenubarItem>
                    <MenubarItem
                      onClick={() =>
                        setFilterCriteria((prev) => ({ ...prev, sort: 'date' }))
                      }
                    >
                      Sort by Date
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarSub>
                      <MenubarSubTrigger>Order</MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarItem
                          onClick={() =>
                            setFilterCriteria((prev) => ({
                              ...prev,
                              order: 'asc',
                            }))
                          }
                        >
                          Ascending
                        </MenubarItem>
                        <MenubarItem
                          onClick={() =>
                            setFilterCriteria((prev) => ({
                              ...prev,
                              order: 'desc',
                            }))
                          }
                        >
                          Descending
                        </MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
            <div className="flex justify-center mt-4">
              <div className="mt-6 pr-2">
                <UploadButton
                  userId={userId}
                  apiUrl={pipeline?.deploymentUrl || ''}
                  uploadedDocuments={documents}
                  setUploadedDocuments={setDocuments}
                  onUploadSuccess={() =>
                    pipeline?.deploymentUrl &&
                    fetchDocuments(new r2rClient(pipeline?.deploymentUrl))
                  }
                  showToast={toast}
                />
              </div>
              <div className="mt-6 pr-2">
                <DeleteButton
                  selectedDocumentIds={selectedDocumentIds}
                  apiUrl={pipeline?.deploymentUrl || ''}
                  onDelete={() => setSelectedDocumentIds([])}
                  onSuccess={() =>
                    pipeline?.deploymentUrl &&
                    fetchDocuments(new r2rClient(pipeline?.deploymentUrl))
                  }
                  showToast={toast}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="table-container">
              <table className="min-w-full bg-zinc-800 border border-gray-600">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="px-4 py-2 text-left text-white">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="pl-11">Document ID </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Click on a Document ID to copy it to clipboard
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="px-4 py-2 text-left text-white">User ID</th>
                    <th className="px-4 py-2 text-left text-white">Title</th>
                    <th className="px-4 py-2 text-left text-white">Version</th>
                    <th className="px-4 py-2 text-left text-white">
                      Updated At
                    </th>
                    <th className="px-4 py-2 text-left text-white">
                      Size in MB
                    </th>
                    <th className="px-4 py-2 text-left text-white">Actions</th>
                    <th className="px-4 py-2 text-left text-white">Metadata</th>
                  </tr>
                </thead>
                <tbody
                  className={`transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                >
                  {renderTableRows()}
                </tbody>
              </table>
            </div>
          </div>

          {!isLoading && !error && filteredAndSortedDocuments.length > 0 && (
            <div className="flex justify-center mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </main>
      <DocumentInfoDialog
        documentId={selectedDocumentId}
        apiUrl={pipeline?.deploymentUrl || ''}
        open={isDocumentInfoDialogOpen}
        onClose={() => setIsDocumentInfoDialogOpen(false)}
      />
    </Layout>
  );
};

export default Index;

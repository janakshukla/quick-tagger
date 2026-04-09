import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useSubmit, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

// 1. BACKEND READ: Handle Search and Pagination
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction");

  let paginationArgs = `first: 5`;
  if (direction === "next" && cursor) {
    paginationArgs = `first: 5, after: "${cursor}"`;
  } else if (direction === "prev" && cursor) {
    paginationArgs = `last: 5, before: "${cursor}"`;
  }

  const safeSearch = q.replace(/"/g, ''); 
  const queryArg = safeSearch ? `, query: "title:${safeSearch}*"` : "";

  const response = await admin.graphql(
    `#graphql
      query {
        products(${paginationArgs}${queryArg}) {
          edges {
            node {
              id
              title
              tags
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }`
  );

  const parsedData = await response.json();
  return { 
    products: parsedData.data?.products?.edges || [], 
    pageInfo: parsedData.data?.products?.pageInfo || {},
    searchTerm: q
  };
};

// 2. BACKEND WRITE: Handle Dynamic Custom Tags
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const productId = formData.get("productId");
  const intent = formData.get("intent"); 
  const tagValue = formData.get("tagValue") as string; // We now receive the custom tag

  if (!tagValue) return { error: "Tag is required" };

  if (intent === "add") {
    await admin.graphql(
      `#graphql
        mutation addTag($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) { node { id } }
        }`,
      { variables: { id: productId, tags: [tagValue] } }
    );
  } else if (intent === "remove") {
    await admin.graphql(
      `#graphql
        mutation removeTag($id: ID!, $tags: [String!]!) {
          tagsRemove(id: $id, tags: $tags) { node { id } }
        }`,
      { variables: { id: productId, tags: [tagValue] } }
    );
  }

  return { success: true, intent, tagValue };
};

// 3. FRONTEND UI
export default function Index() {
  const { products, pageInfo, searchTerm } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const [searchParams] = useSearchParams();

  // State for the Search Bar
  const [searchInput, setSearchInput] = useState(searchTerm);

  // State for the Modal
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState("");

  useEffect(() => {
    if (fetcher.data?.success) {
      const actionWord = fetcher.data.intent === "add" ? "added" : "removed";
      shopify.toast.show(`Tag '${fetcher.data.tagValue}' ${actionWord} successfully!`);
    }
  }, [fetcher.data, shopify]);

  // Modal Handlers
  const handleOpenModal = (productId: string) => {
    setActiveProductId(productId);
    setCustomTagInput("");
    shopify.modal.show("custom-tag-modal");
  };

  const handleCloseModal = () => {
    shopify.modal.hide("custom-tag-modal");
    setActiveProductId(null);
    setCustomTagInput("");
  };

  // Add Tag Action
  const handleSaveCustomTag = () => {
    if (!customTagInput.trim() || !activeProductId) return;
    fetcher.submit(
      { productId: activeProductId, intent: "add", tagValue: customTagInput.trim() }, 
      { method: "POST" }
    );
    handleCloseModal();
  };

  // Remove Specific Tag Action
  const handleRemoveTag = (productId: string, tagValue: string) => {
    fetcher.submit(
      { productId, intent: "remove", tagValue }, 
      { method: "POST" }
    );
  };

  // Pagination Handler
  const paginate = (direction: "next" | "prev") => {
    const currentQ = searchParams.get("q") || "";
    const cursor = direction === "next" ? pageInfo.endCursor : pageInfo.startCursor;
    submit({ q: currentQ, cursor, direction }, { method: "GET" });
  };

  return (
    <s-page heading="Quick Tagger">
      <s-section heading="Manage Custom Tags">
        <s-paragraph>Search products and apply your own custom tags.</s-paragraph>
        
        {/* Search Bar */}
        <s-box paddingBlockEnd="base">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Search products by title..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit({ q: searchInput }, { method: "GET" });
              }}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <s-button variant="primary" onClick={() => submit({ q: searchInput }, { method: "GET" })}>
              Search
            </s-button>
            {searchTerm && (
              <s-button onClick={() => { setSearchInput(""); submit({}, { method: "GET" }); }}>
                Clear
              </s-button>
            )}
          </div>
        </s-box>

        {/* Product List */}
        <s-stack direction="block" gap="base">
          {products.length === 0 ? (
            <s-box padding="base"><s-paragraph>No products found.</s-paragraph></s-box>
          ) : (
            products.map(({ node }: any) => {
              const isUpdating = fetcher.state !== "idle" && fetcher.formData?.get("productId") === node.id;

              return (
                <s-box key={node.id} padding="base" borderWidth="base" borderRadius="base" background="subdued">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', marginBottom: '8px' }}>{node.title}</strong>
                      
                      {/* Interactive Tag Badges */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                        {node.tags.map((tag: string) => (
                          <span 
                            key={tag} 
                            style={{
                              background: "#ebebeb", 
                              padding: "4px 8px", 
                              borderRadius: "16px", 
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            {tag}
                            <button 
                              onClick={() => handleRemoveTag(node.id, tag)}
                              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#666" }}
                              title="Remove Tag"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <s-button 
                      onClick={() => handleOpenModal(node.id)}
                      variant="primary"
                      {...(isUpdating ? { loading: true } : {})}
                    >
                      Add Tag
                    </s-button>

                  </div>
                </s-box>
              );
            })
          )}
        </s-stack>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          <s-button disabled={!pageInfo.hasPreviousPage} onClick={() => paginate("prev")}>
            &larr; Previous
          </s-button>
          <s-button disabled={!pageInfo.hasNextPage} onClick={() => paginate("next")}>
            Next &rarr;
          </s-button>
        </div>

      </s-section>

      {/* The Native App Bridge Modal for Custom Tags */}
      <ui-modal id="custom-tag-modal">
        <div style={{ padding: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Tag Name
          </label>
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            placeholder="e.g., Summer Sale, Premium, Wholesale"
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveCustomTag();
              }
            }}
            autoFocus
          />
        </div>
        <ui-titlebar title="Add Custom Tag">
          <button variant="primary" onClick={handleSaveCustomTag}>Save Tag</button>
          <button onClick={handleCloseModal}>Cancel</button>
        </ui-titlebar>
      </ui-modal>
      
    </s-page>
  );
}
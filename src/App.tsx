import React, {useState, useEffect} from 'react';
import './App.css';
import QRCode from 'react-qr-code';
import { processReceipt, type ReceiptData } from './receiptProcessor';

/*
items you're paying for:
cost: ___ proportion: ___ [remove item]
...
[add item]
subtotal (for the whole bill): ___
total (for the whole bill): ___
tip: _.2 [ ] flat [x] rate
discount: __0 [x] proportional [ ] custom proportion: ___
[submit]
You owe: $5.69
*/

interface Item {
  name?: string
  cost: number
  // how many people you're paying for
  portionsPaying: number
  // how many people this was split with
  totalPortions: number
  id: string
}

interface FormState {
  items: Partial<Item>[]
  subtotal?: number
  total?: number
  tip: number
  tipIsRate: boolean
  tipIncludedInTotal: boolean
  isPayingMe: boolean
}

function emptyItem(): Partial<Item> {
  return {portionsPaying: 1, totalPortions: 1, id: crypto.randomUUID()}
}

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function getVenmoUrl(amount: string, note: string, recipient?: string): string {
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // Use venmo:// scheme for mobile (no @ symbol for recipient)
    const baseUrl = 'venmo://paycharge?txn=pay';
    const params = `amount=${amount}&note=${note}`;
    return recipient 
      ? `${baseUrl}&${params}&recipients=${recipient}`
      : `${baseUrl}&${params}`;
  } else {
    // Use https:// for desktop (@ symbol required for recipient)
    const baseUrl = 'https://venmo.com/?txn=pay';
    const params = `amount=${amount}&note=${note}`;
    return recipient 
      ? `${baseUrl}&${params}&recipients=@${recipient}`
      : `${baseUrl}&${params}`;
  }
}

function encodeFormState(state: FormState): string {
  try {
    const json = JSON.stringify(state);
    return btoa(json);
  } catch (error) {
    console.error('Failed to encode form state:', error);
    return '';
  }
}

function decodeFormState(encoded: string): FormState | null {
  try {
    const json = atob(encoded);
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to decode form state:', error);
    return null;
  }
}

function App() {
  const [items, setItems] = useState<Partial<Item>[]>([emptyItem()])
  const [subtotal, setSubtotal] = useState<number>()
  const [total, setTotal] = useState<number>()
  const [tip, setTip] = useState<number>(20)
  const [tipIsRate, setTipIsRate] = useState<boolean>(true)
  const [tipIncludedInTotal, setTipIncludedInTotal] = useState<boolean>(false)
  // TODO discounts
  // const [discount, setDiscount] = useState<number>()
  // const [discountIsProportional, setDiscountIsProportional] = useState<boolean>(true)
  // const [discountCustomProportion, setDiscountCustomProportion] = useState<number>()
  const [isPayingMe, setIsPayingMe] = useState<boolean>(false)
  const [showQRCode, setShowQRCode] = useState<boolean>(false)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState<boolean>(false)
  const [receiptError, setReceiptError] = useState<string>()
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false)
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [linkCopied, setLinkCopied] = useState<boolean>(false)
  
  // Feature flag: Check for ?receipt-upload query parameter
  const receiptUploadEnabled = new URLSearchParams(window.location.search).has('receipt-upload-enabled')

  // Load state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    
    if (data) {
      const decoded = decodeFormState(data);
      if (decoded) {
        // Populate all state from decoded data
        setItems(decoded.items.map(item => ({
          ...item,
          id: item.id || crypto.randomUUID() // Ensure all items have IDs
        })));
        setSubtotal(decoded.subtotal);
        setTotal(decoded.total);
        setTip(decoded.tip);
        setTipIsRate(decoded.tipIsRate);
        setTipIncludedInTotal(decoded.tipIncludedInTotal);
        setIsPayingMe(decoded.isPayingMe);
      }
    }
  }, []); // Run only once on mount

  const debt = (() => {
    let mySubtotal = 0
    for (const {cost, portionsPaying, totalPortions} of items) {
      const actualTotal = Math.max(1, Math.abs(totalPortions ?? 1))
      const proportion = (portionsPaying ?? 1) / actualTotal
      mySubtotal += (cost ?? 0) * proportion
    }
    const tax = (total ?? mySubtotal) - (subtotal ?? mySubtotal)
    const tipCost = tipIsRate ? (total ?? subtotal ?? mySubtotal) * tip / 100 : tip
    const fees = tax + tipCost
    const myRatio = mySubtotal / (subtotal ?? mySubtotal)
    if (!(subtotal || mySubtotal)) {
      return 0
    }
    const myFees = fees * myRatio
    // console.log({mySubtotal, subtotal, total, tax, tipCost, fees, myRatio})
    return mySubtotal + myFees
  })();

  function setItem(index: number, item: Partial<Item>) {
    setItems(items => {
      const newItems = items.slice()
      newItems[index] = {...items[index], ...item}
      return newItems
    })
  }

  function removeItem(index: number) {
    setItems(items => {
      const newItems = items.slice()
      newItems.splice(index, 1)
      return newItems
    })
  }

  function addItem() {
    setItems(items => [...items, {portionsPaying: 1, totalPortions: 1, id: crypto.randomUUID()}])
  }

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Check for API key
    const apiKey = localStorage.getItem('openrouter_api_key')
    if (!apiKey) {
      setShowApiKeyModal(true)
      event.target.value = '' // Reset file input
      return
    }

    setIsProcessingReceipt(true)
    setReceiptError(undefined)

    try {
      console.log('Receipt selected:', file.name, file.type)
      
      // Process the receipt using the extracted module
      const parsedData = await processReceipt(file, apiKey)
      
      // Populate the form
      populateFormFromReceipt(parsedData)
      
    } catch (error) {
      console.error('Error processing receipt:', error)
      setReceiptError(error instanceof Error ? error.message : 'Failed to process receipt')
    } finally {
      setIsProcessingReceipt(false)
      // Reset the input so the same file can be selected again
      event.target.value = ''
    }
  }
  
  function populateFormFromReceipt(data: ReceiptData) {
    // Replace items with parsed items
    const newItems: Partial<Item>[] = data.items.map((item: ReceiptData['items'][number]) => ({
      name: item.name,
      cost: item.cost,
      portionsPaying: 1,
      totalPortions: 1,
      id: crypto.randomUUID()
    }))
    
    setItems(newItems)
    
    // Set subtotal and total
    if (data.subtotal) {
      setSubtotal(data.subtotal)
    }
    if (data.total) {
      setTotal(data.total)
    }
    
    // Handle tip
    if (data.tipIncludedInTotal) {
      setTip(0)
      setTipIncludedInTotal(true)
    } else if (data.tip) {
      setTip(data.tip)
      setTipIsRate(false)
      setTipIncludedInTotal(false)
    } else {
      setTipIncludedInTotal(false)
    }
    
    console.log('Form populated successfully')
  }

  function handleSaveApiKey() {
    if (!apiKeyInput.trim()) {
      return
    }
    localStorage.setItem('openrouter_api_key', apiKeyInput.trim())
    setShowApiKeyModal(false)
    setApiKeyInput('')
  }

  function getShareUrl(): string {
    const formState: FormState = {
      items,
      subtotal,
      total,
      tip,
      tipIsRate,
      tipIncludedInTotal,
      isPayingMe
    };
    const encoded = encodeFormState(formState);
    return `${window.location.origin}${window.location.pathname}?data=${encoded}`;
  }

  async function handleCopyLink() {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }

  async function handleShareLink() {
    const url = getShareUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Dinner Debt',
          text: 'Split the bill with me',
          url: url
        });
      } else {
        // Fallback to copy if share not available
        await handleCopyLink();
      }
    } catch (error) {
      // User cancelled or share failed
      console.error('Failed to share:', error);
    }
  }

  const debtStr = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(debt)
  const amountStr = debtStr.substring(1); // remove the dollar sign for Venmo
  const note = encodeURIComponent("dinner-debt")

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Dinner Debt</h1>
        <p className="app-description">
          Calculate how much you owe someone for dinner,
          including your portion of the tax and tip based on what you ordered.
        </p>
      </header>
      
      <section className="form-section">
        <h2 className="section-title">Items</h2>
        
        <div className="items-container">
          {items.map((item, index) => {
            // Calculate the max split value across all items
            const maxSplit = Math.max(8, ...items.map(i => Math.abs(i.totalPortions ?? 1)))
            
            return (
              <div key={item.id} className="item-card">
                {item.name && (
                  <div className="item-name">
                    <input
                      type="text"
                      className="item-name-input"
                      value={item.name}
                      onChange={(ev) => setItem(index, {name: ev.target.value})}
                      placeholder="Item name"
                    />
                  </div>
                )}
                
                <div className="item-controls">
                  <button 
                    className="btn btn-danger btn-sm btn-remove" 
                    onClick={() => removeItem(index)}
                  >
                    ×
                  </button>
                  
                  <div className="control-group">
                    <label className="control-label">Cost</label>
                    <div className="currency-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        className="form-control form-control-sm currency-input"
                        name={`cost${index}`}
                        type="text"
                        inputMode="decimal"
                        value={item.cost ?? ''}
                        onChange={(ev) => setItem(index, {cost: safeEval(ev.target.value, 1)})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="control-group">
                    <label className="control-label">Split?</label>
                    {(item.totalPortions ?? 1) < 0 || item.totalPortions === 0 ? (
                      <input
                        className="form-control form-control-sm"
                        type="number"
                        inputMode="numeric"
                        value={item.totalPortions === 0 ? '' : Math.abs(item.totalPortions ?? 1)}
                        onChange={(ev) => {
                          const value = ev.target.value
                          const newTotal = value === '' ? 0 : Number(value)
                          const actualTotal = Math.max(1, newTotal)
                          const newPaying = Math.min(item.portionsPaying ?? 1, actualTotal)
                          setItem(index, {totalPortions: newTotal === 0 ? 0 : -Math.abs(newTotal), portionsPaying: newPaying})
                        }}
                      />
                    ) : (
                      <select 
                        className="form-control portion-select"
                        value={item.totalPortions ?? 1}
                        onChange={(ev) => {
                          const value = ev.target.value
                          if (value === 'more') {
                            const newTotal = maxSplit + 1
                            const newPaying = Math.min(item.portionsPaying ?? 1, newTotal)
                            setItem(index, {totalPortions: -newTotal, portionsPaying: newPaying})
                          } else {
                            const newTotal = Number(value)
                            const newPaying = Math.min(item.portionsPaying ?? 1, newTotal)
                            setItem(index, {totalPortions: newTotal, portionsPaying: newPaying})
                          }
                        }}
                      >
                        <option value={1}>Just me</option>
                        {Array.from({length: maxSplit - 1}, (_, i) => i + 2).map(n => (
                          <option key={n} value={n}>{n} people</option>
                        ))}
                        <option value="more">...more</option>
                      </select>
                    )}
                  </div>
                  
                  <div className="control-group">
                    <label className="control-label">Paying for</label>
                    <select 
                      className="form-control portion-select"
                      value={item.portionsPaying ?? 1}
                      onChange={(ev) => setItem(index, {portionsPaying: Number(ev.target.value)})}
                    >
                      {Array.from({length: Math.max(1, Math.abs(item.totalPortions ?? 1))}, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n === 1 ? 'Just me' : `${n} people`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="action-buttons-container">
          <div className="action-buttons">
            {receiptUploadEnabled && (
              <>
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  capture="environment"
                  onChange={handleReceiptUpload}
                  style={{ display: 'none' }}
                  disabled={isProcessingReceipt}
                />
                <label htmlFor="receipt-upload" className={`btn btn-outline upload-button ${isProcessingReceipt ? 'disabled' : ''}`}>
                  {isProcessingReceipt ? 'Processing...' : '📸 Upload Receipt (beta)'}
                </label>
              </>
            )}
            
            <button 
              className="btn btn-primary" 
              onClick={() => addItem()}
            >
              Add Item
            </button>
          </div>
          
          {receiptError && (
            <div className="error-message">{receiptError}</div>
          )}
        </div>
        
      </section>
      
      <section className="form-section">
        <h2 className="section-title">Bill Details</h2>
        <div className="form-group">
          <label className="form-label" htmlFor='sub'>Subtotal (Whole Bill)</label>
          <div className="currency-input-wrapper">
            <span className="currency-symbol">$</span>
            <input 
              className="form-control form-control-sm currency-input"
              name='sub' 
              type='text' 
              inputMode="decimal"
              value={subtotal ?? ''}
              onChange={(ev) => setSubtotal(Number.parseFloat(ev.target.value))} 
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor='total'>Total (Whole Bill)</label>
          <div className="currency-input-wrapper">
            <span className="currency-symbol">$</span>
            <input 
              className="form-control form-control-sm currency-input"
              name='total' 
              type='text' 
              inputMode="decimal"
              value={total ?? ''}
              onChange={(ev) => setTotal(Number.parseFloat(ev.target.value))} 
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor='tip'>
            Tip{tipIncludedInTotal && ' *'}
          </label>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div className={tipIsRate ? "percent-input-wrapper" : "currency-input-wrapper"} style={{marginRight: '0.5rem'}}>
              {!tipIsRate && <span className="currency-symbol">$</span>}
              <input 
                className={`form-control form-control-sm ${tipIsRate ? 'percent-input' : 'currency-input'}`}
                name='tip' 
                type='number' 
                inputMode="decimal"
                value={tip} 
                onChange={(ev) => setTip(Number.parseFloat(ev.target.value))} 
              />
              {tipIsRate && <span className="percent-symbol">%</span>}
            </div>
            
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  className="radio-input"
                  name="tipIsRate" 
                  type="radio" 
                  checked={tipIsRate} 
                  onClick={() => setTipIsRate(true)}
                />
                percent
              </label>
              
              <label className="radio-label">
                <input 
                  className="radio-input"
                  name="tipisFlat" 
                  type="radio" 
                  checked={!tipIsRate} 
                  onClick={() => setTipIsRate(false)}
                />
                flat amount
              </label>
            </div>
          </div>
          {tipIncludedInTotal && (
            <div className="tip-included-notice">
              * Gratuity is already included in the total
            </div>
          )}
        </div>
      </section>
      
      <section className="result-section">
        <h2 className="section-title">Result</h2>
        <div className="result-amount">You owe: {debtStr}</div>
        
        <div className="form-group">
          <p>Are you paying Mike Delmonaco?</p>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                className="radio-input"
                name="not-paying-me" 
                type="radio" 
                checked={!isPayingMe} 
                onClick={() => setIsPayingMe(false)}
              />
              No
            </label>
            
            <label className="radio-label">
              <input 
                className="radio-input"
                name="paying-me" 
                type="radio" 
                checked={isPayingMe} 
                onClick={() => setIsPayingMe(true)}
              />
              Yes
            </label>
          </div>
        </div>
        
        {isPayingMe ? (
          <a 
            className="action-button venmo-button" 
            href={getVenmoUrl(amountStr, note, 'Mike-Delmonaco')}
          >
            Pay Mike Delmonaco with Venmo
          </a>
        ): (
          <a 
            className="action-button venmo-button" 
            href={getVenmoUrl(amountStr, note)}
          >
            Pay with Venmo
          </a>
        )}
      </section>
      
      <section className="form-section">
        <div 
          className="qr-toggle"
          onClick={() => setShowQRCode(b => !b)}
        >
          {showQRCode ? '▼ Hide QR Code' : '▶ Show QR Code'}
        </div>
        
        {showQRCode && (
          <div className="qr-container">
            <QRCode 
              value={getShareUrl()}
              bgColor="var(--background-secondary)"
              fgColor="#dcddde"
              level="M"
              style={{ width: '100%', height: 'auto', maxWidth: '400px' }}
            />
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleCopyLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Copy Link</span>
                {linkCopied ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="4" width="9" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M4 12H3C2.44772 12 2 11.5523 2 11V2C2 1.44772 2.44772 1 3 1H9C9.55228 1 10 1.44772 10 2V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleShareLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Share</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7V14C3 14.5523 3.44772 15 4 15H12C12.5523 15 13 14.5523 13 14V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 10V2M8 2L5.5 4.5M8 2L10.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>
      
      <footer className="app-footer">
        Created by Mike Delmonaco
        <br/>
        <a href="https://github.com/quasarbright/dinner-debt">Source Code</a>
      </footer>
      
      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">OpenRouter API Key Required</h2>
            <p className="modal-description">
              To use receipt upload, you need an OpenRouter API key. This will likely incur costs to your OpenRouter account.
            </p>
            <div className="modal-warning">
              ⚠️ <strong>Security Warning:</strong> Your API key will be stored in your browser's localStorage. 
              This is NOT secure storage. Only paste your key if you understand the risk.
            </div>
            <input
              type="password"
              className="form-control api-key-input"
              placeholder="sk-or-v1-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <div className="modal-actions">
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowApiKeyModal(false)
                  setApiKeyInput('')
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function safeEval(expr: string, defaultValue: any) {
  try {
    return eval(expr)
  } catch (ignored) {
    return defaultValue
  }
}

export default App;

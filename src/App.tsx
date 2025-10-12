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
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  const [betaFeaturesEnabled, setBetaFeaturesEnabled] = useState<boolean>(
    localStorage.getItem('beta_features_enabled') === 'true'
  )
  const [isEditingApiKey, setIsEditingApiKey] = useState<boolean>(false)
  
  // Feature flag: Check if beta features are enabled (API key will be checked on upload)
  const receiptUploadEnabled = betaFeaturesEnabled

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

  function handleReceiptUploadClick() {
    // Check for API key first
    const apiKey = localStorage.getItem('openrouter_api_key')
    if (!apiKey) {
      // Open settings modal and show API key input
      setShowSettingsModal(true)
      setIsEditingApiKey(true)
      return
    }
    
    // If API key exists, trigger the file input
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement
    fileInput?.click()
  }

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const apiKey = localStorage.getItem('openrouter_api_key')
    if (!apiKey) {
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

  function handleToggleBetaFeatures(enabled: boolean) {
    setBetaFeaturesEnabled(enabled)
    localStorage.setItem('beta_features_enabled', enabled.toString())
  }

  function handleUpdateApiKey() {
    if (!apiKeyInput.trim()) {
      return
    }
    localStorage.setItem('openrouter_api_key', apiKeyInput.trim())
    setApiKeyInput('')
    setIsEditingApiKey(false)
  }

  function handleDeleteApiKey() {
    if (window.confirm('Are you sure you want to delete your API key?')) {
      localStorage.removeItem('openrouter_api_key')
      setApiKeyInput('')
      setIsEditingApiKey(false)
      // Force a re-render by closing and reopening the modal
      setShowSettingsModal(false)
      setTimeout(() => setShowSettingsModal(true), 0)
    }
  }

  function maskApiKey(key: string): string {
    if (key.length <= 10) return key
    return key.slice(0, 8) + '...' + key.slice(-6)
  }

  function openSettings() {
    setShowSettingsModal(true)
    setIsEditingApiKey(false)
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
        <button 
          className="settings-button" 
          onClick={openSettings}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
                  onChange={handleReceiptUpload}
                  style={{ display: 'none' }}
                  disabled={isProcessingReceipt}
                />
                <button 
                  className={`btn btn-outline upload-button ${isProcessingReceipt ? 'disabled' : ''}`}
                  onClick={handleReceiptUploadClick}
                  disabled={isProcessingReceipt}
                >
                  {isProcessingReceipt ? 'Processing...' : '📸 Upload Receipt (beta)'}
                </button>
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
                className="btn btn-outline" 
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
                className="btn btn-outline" 
                onClick={handleShareLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Share Link</span>
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
              To use receipt upload, you need an OpenRouter API key. This will incur costs to your OpenRouter account (less than $0.01 per receipt).
            </p>
            <div className="modal-warning">
              ⚠️ <strong>Security Warning:</strong> Your API key will be stored as plaintext in your browser's localStorage.
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

      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Settings</h2>
            
            <div className="settings-section">
              <div className="settings-section-header">
                <h3 className="settings-section-title">Beta Features</h3>
              </div>
              <p className="settings-description">
                Access experimental features like receipt upload
              </p>
              
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={betaFeaturesEnabled}
                  onChange={(e) => handleToggleBetaFeatures(e.target.checked)}
                />
                <span className="toggle-switch"></span>
                <span className="toggle-text">Enable Beta Features</span>
              </label>
            </div>

            {betaFeaturesEnabled && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3 className="settings-section-title">API Key</h3>
                </div>
                <p className="settings-description">
                  OpenRouter API key for receipt processing. This will incur costs to your OpenRouter account (less than $0.01 per receipt).
                </p>
                
                <div className="modal-warning">
                  ⚠️ <strong>Security Warning:</strong> Your API key is stored as plaintext in your browser's localStorage. This is NOT secure storage.
                </div>

                {(() => {
                  const currentKey = localStorage.getItem('openrouter_api_key')
                  
                  if (isEditingApiKey || !currentKey) {
                    return (
                      <>
                        <input
                          type="password"
                          className="form-control api-key-input"
                          placeholder="sk-or-v1-..."
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateApiKey()}
                        />
                        <div className="settings-actions">
                          {currentKey && (
                            <button 
                              className="btn btn-outline" 
                              onClick={() => {
                                setIsEditingApiKey(false)
                                setApiKeyInput('')
                              }}
                            >
                              Cancel
                            </button>
                          )}
                          <button 
                            className="btn btn-primary" 
                            onClick={handleUpdateApiKey}
                            disabled={!apiKeyInput.trim()}
                          >
                            {currentKey ? 'Update Key' : 'Save Key'}
                          </button>
                        </div>
                      </>
                    )
                  } else {
                    return (
                      <>
                        <div className="api-key-display">
                          <code>{maskApiKey(currentKey)}</code>
                        </div>
                        <div className="settings-actions">
                          <button 
                            className="btn btn-outline" 
                            onClick={() => setIsEditingApiKey(true)}
                          >
                            Update Key
                          </button>
                          <button 
                            className="btn btn-danger" 
                            onClick={handleDeleteApiKey}
                          >
                            Delete Key
                          </button>
                        </div>
                      </>
                    )
                  }
                })()}
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowSettingsModal(false)
                  setIsEditingApiKey(false)
                  setApiKeyInput('')
                }}
              >
                Close
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

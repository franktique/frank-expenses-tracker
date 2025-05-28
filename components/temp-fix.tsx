// This is the missing function
const togglePaymentMethod = (method: string) => {
  setExcludedPaymentMethods(prev => {
    if (prev.includes(method)) {
      return prev.filter(m => m !== method)
    } else {
      return [...prev, method]
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const plans = document.querySelectorAll('.plan');
  const amountInput = document.getElementById('amount');
  const investForm = document.getElementById('investForm');

  plans.forEach(plan => {
    plan.addEventListener('click', () => {
      // Remove "selected" from all
      plans.forEach(p => p.classList.remove('selected'));
      // Mark the clicked one
      plan.classList.add('selected');
      amountInput.value = plan.getAttribute('data-amount');
    });
  });

  investForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value);

    if (!amount) {
      alert('Please select an investment plan first.');
      return;
    }

    try {
      const response = await fetch('/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Investment saved! ID: ${data.insertedId}`);
        amountInput.value = '';
        plans.forEach(p => p.classList.remove('selected'));
      } else {
        alert(`❌ Error: ${data.error || 'Failed to save investment'}`);
      }
    } catch (error) {
      alert('❌ Network error. Please try again later.');
    }
  });
});

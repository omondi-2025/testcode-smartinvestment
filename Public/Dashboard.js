document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');

  // Protect dashboard access
  if (!token || !email) {
    alert("Please log in first.");
    window.location.href = 'auth.html';
    return;
  }

  // Display user email
  const userEmailElement = document.getElementById('userEmail');
  if (userEmailElement) {
    userEmailElement.textContent = `Logged in as: ${email}`;
  }

  // Logout function
  window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    window.location.href = 'auth.html';
  };

  // Fetch and render investments
  const container = document.getElementById('dashboard');
  if (container) {
    container.innerHTML = "<p>Loading your investments...</p>";

    fetch('/api/investments', {
      headers: { 'Authorization': token }
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized or failed request");
        return res.json();
      })
      .then(data => {
        container.innerHTML = ""; // Clear loading message

        if (!Array.isArray(data) || data.length === 0) {
          container.innerHTML = "<p>No investments yet.</p>";
          return;
        }

        data.forEach(investment => {
          const investmentDate = new Date(investment.date);
          const today = new Date();
          const daysPassed = Math.floor((today - investmentDate) / (1000 * 60 * 60 * 24));
          const cappedDays = Math.min(daysPassed, 45);
          const earnings = cappedDays * investment.earningsPerDay;

          const card = document.createElement('div');
          card.className = 'plan';
          card.innerHTML = `
            <p><strong>Amount:</strong> KES ${investment.amount}</p>
            <p><strong>Days Passed:</strong> ${cappedDays} / 45</p>
            <p><strong>Earned So Far:</strong> KES ${earnings.toFixed(2)}</p>
          `;
          container.appendChild(card);
        });
      })
      .catch(error => {
        console.error('Error fetching investments:', error);
        container.innerHTML = "<p>❌ Failed to load investments. Please try again later.</p>";
      });
  }
});
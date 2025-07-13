<script>
document.addEventListener("DOMContentLoaded", () => {
  const investButtons = document.querySelectorAll(".invest-btn");

  // Load current user and wallet balance
  let currentUser = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
  let userBalance = parseFloat(currentUser.wallet || "0");

  // Display wallet balance if element exists
  const walletDisplay = document.getElementById("walletBalance");
  if (walletDisplay) {
    walletDisplay.textContent = `KES ${userBalance.toFixed(2)}`;
  }

  investButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".plan-card");
      if (!card) return;

      const amount = parseFloat(card.dataset.amount || "0");
      const percent = card.querySelectorAll("p")[0]?.textContent || "";
      const duration = card.querySelectorAll("p")[1]?.textContent || "";

      const confirmInvest = confirm(
        `🔐 Confirm Investment:\n\nAmount: KES ${amount}\nEarning Rate: ${percent}\nDuration: ${duration}\n\nDo you want to proceed?`
      );

      if (!confirmInvest) return;

      if (userBalance < amount) {
        alert("❌ Insufficient wallet balance.\nPlease recharge your wallet first.");
        return;
      }

      // Deduct amount
      userBalance -= amount;
      currentUser.wallet = userBalance;
      localStorage.setItem("user", JSON.stringify(currentUser));

      if (walletDisplay) {
        walletDisplay.textContent = `KES ${userBalance.toFixed(2)}`;
      }

      // Record investment
      const investment = {
        amount,
        percent,
        duration,
        startDate: new Date().toISOString(),
        status: "active",
        earningsStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      let investments = JSON.parse(localStorage.getItem("investments") || "[]");
      investments.push(investment);
      localStorage.setItem("investments", JSON.stringify(investments));

      alert(`✅ Success! You've initiated an investment of KES ${amount}.\nEarnings will begin after 24 hours.`);
    });
  });
});
</script>
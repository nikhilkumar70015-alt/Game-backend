const token = localStorage.getItem("adminToken");

if (!token) {
    window.location.href = "login.html";
}

function logout() {
    localStorage.removeItem("adminToken");
    window.location.href = "login.html";
}

async function createTournament() {
    const title = document.getElementById("title").value;
    const entryFee = document.getElementById("entryFee").value;
    const prize = document.getElementById("prize").value;
    const totalSlots = document.getElementById("slots").value;

    await fetch("http://localhost:5000/api/tournaments/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            title,
            entryFee,
            prize,
            totalSlots
        })
    });

    loadTournaments();
}

async function loadTournaments() {
    const res = await fetch("http://localhost:5000/api/tournaments");
    const tournaments = await res.json();

    const container = document.getElementById("tournamentList");
    container.innerHTML = "";

    tournaments.forEach(t => {

        let joinedHtml = "";

        if (t.joinedUsers.length > 0) {
            joinedHtml += "<h5>Joined Players:</h5>";
            t.joinedUsers.forEach(u => {
                joinedHtml += `
                    <div>
                        ${u.name} (${u._id})
                        <button onclick="declareWinner('${t._id}','${u._id}')">
                            Declare Winner
                        </button>
                    </div>
                `;
            });
        }

        container.innerHTML += `
            <div style="border:1px solid black; padding:10px; margin:10px;">
                <h4>${t.title}</h4>
                <p>Status: ${t.status}</p>
                <p>Slots: ${t.joinedUsers.length}/${t.totalSlots}</p>
                <button onclick="setLive('${t._id}')">Set Live</button>
                <hr>
                ${joinedHtml}
            </div>
        `;
    });
}

async function setLive(id) {
    await fetch(`http://localhost:5000/api/tournaments/${id}/status`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ status: "live" })
    });

    loadTournaments();
}

async function declareWinner(tournamentId, winnerId) {

    await fetch(`http://localhost:5000/api/tournaments/${tournamentId}/declare-winner`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ winnerId })
    });

    loadTournaments();
}

async function loadDeposits() {
    const res = await fetch("http://localhost:5000/api/tournaments/deposits", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const deposits = await res.json();
    const container = document.getElementById("depositList");
    container.innerHTML = "";

    deposits
        .filter(d => d.status === "pending")
        .forEach(d => {
            container.innerHTML += `
                <div style="border:1px solid red; padding:10px; margin:10px;">
                    <p>User: ${d.user.name}</p>
                    <p>Amount: ${d.amount}</p>
                    <p>UTR: ${d.utrNumber}</p>
                    <button onclick="approveDeposit('${d._id}')">
                        Approve
                    </button>
                    <button onclick="rejectDeposit('${d._id}')">
                        Reject
                    </button>
                </div>
            `;
        });
}

async function approveDeposit(id) {
    await fetch(`http://localhost:5000/api/tournaments/deposit/${id}/approve`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    loadDeposits();
}

async function rejectDeposit(id) {
    await fetch(`http://localhost:5000/api/tournaments/deposit/${id}/reject`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    loadDeposits();
}

async function loadWithdraws() {
    const res = await fetch("http://localhost:5000/api/tournaments/withdraws", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const withdraws = await res.json();
    const container = document.getElementById("withdrawList");
    container.innerHTML = "";

    withdraws
        .filter(w => w.status === "pending")
        .forEach(w => {
            container.innerHTML += `
                <div style="border:1px solid blue; padding:10px; margin:10px;">
                    <p>User: ${w.user.name}</p>
                    <p>Amount: ₹${w.amount}</p>
                    <button onclick="approveWithdraw('${w._id}')">
                        Approve
                    </button>
                    <button onclick="rejectWithdraw('${w._id}')">
                        Reject
                    </button>
                </div>
            `;
        });
}

async function approveWithdraw(id) {
    await fetch(`http://localhost:5000/api/tournaments/withdraw/${id}/approve`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    loadWithdraws();
}

async function rejectWithdraw(id) {
    await fetch(`http://localhost:5000/api/tournaments/withdraw/${id}/reject`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    loadWithdraws();
}

loadTournaments();
loadDeposits();
loadWithdraws();
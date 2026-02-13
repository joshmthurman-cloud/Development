<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$user = $config['config']['user'];
$password = $config['config']['password'];
$database = $config['config']['dbname'];

//$user = 'C3GUI';
//$password = 'QAZSE4RFVZ';
//$database = '*LOCAL';

$customer = isset($_POST['customer']) ? trim($_POST['customer']) : '';
$limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 1;

// Handle clear button
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clear'])) {
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Show Heartbeat For Customer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f0f2f5;
            padding: 40px;
        }
        .form-container {
            background: #ffffff;
            padding: 20px 30px;
            border-radius: 8px;
            max-width: 500px;
            margin: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        input[type="text"], input[type="number"], input[type="submit"] {
            font-size: 1em;
            padding: 10px;
            margin-top: 10px;
        }
        input[type="text"], input[type="number"] {
            width: 100%;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        input[type="submit"] {
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        th, td {
            border: 1px solid #cccccc;
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #007bff;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .error {
            color: red;
            text-align: center;
            font-weight: bold;
        }
    </style>
</head>
<body>

<div class="form-container">
    <h2>Show Heartbeat For Customer</h2>
    <form method="post">
        <label for="customer"><strong>Customer Number (MFCUST):</strong></label>
        <input type="text" name="customer" id="customer" value="<?= htmlspecialchars($customer) ?>" required>

        <label for="limit"><strong>Number of Records (1-50):</strong></label>
        <input type="number" name="limit" id="limit" min="1" max="50" value="<?= htmlspecialchars($limit) ?>" required>
        
        <input type="submit" value="Fetch Records">
        <input type="submit" name="clear" value="Clear Form" style="background-color: #6c757d;">
    </form>
</div>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $customer && $limit >= 1 && $limit <= 50) {
    $conn = db2_connect($database, $user, $password);
    if (!$conn) {
        echo "<p class='error'>Connection failed: " . db2_conn_errormsg() . "</p>";
        exit;
    }


    $sql = "
        SELECT SRCUST, SRTYPE, SRTYP2, SRCKEY, SRSTMP, SRRTXT
        FROM CURBSTONE.CCFP7000
        WHERE SRCUST = ?
        ORDER BY SRSTMP DESC
        FETCH FIRST ? ROWS ONLY
    ";

    $stmt = db2_prepare($conn, $sql);
    if (!$stmt) {
        echo "<p class='error'>Prepare failed: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    $exec = db2_execute($stmt, [$customer, $limit]);
    if (!$exec) {
        echo "<p class='error'>Query execution failed: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    $hasRows = false;

    echo "<table>";
echo "<tr>
        <th>CUST</th>
        <th>TYPE</th>
        <th>TYP2</th>
        <th>Heartbeat MFUKEY</th>
        <th>Heartbeat Date</th>
        <th>Heartbeat Time</th>
        <th>Text</th>
      </tr>";

while ($row = db2_fetch_assoc($stmt)) {
    $hasRows = true;

    $timestamp = trim($row['SRSTMP']);
    $date = substr($timestamp, 0, 10);        // e.g., '2025-08-27'
    $time = substr($timestamp, 11, 8);        // e.g., '14.35.12'

    echo "<tr>";
    echo "<td>" . htmlspecialchars($row['SRCUST']) . "</td>";
    echo "<td>" . htmlspecialchars($row['SRTYPE']) . "</td>";
    echo "<td>" . htmlspecialchars($row['SRTYP2']) . "</td>";
    echo "<td>" . htmlspecialchars($row['SRCKEY']) . "</td>";
    //echo "<td>" . htmlspecialchars($row['SRSTMP']) . "</td>";
    echo "<td>" . htmlspecialchars($date) . "</td>";
    echo "<td>" . htmlspecialchars($time) . "</td>";
    echo "<td>" . htmlspecialchars($row['SRRTXT']) . "</td>";
    echo "</tr>";
}


    echo "</table>";

    if (!$hasRows) {
        echo "<p class='error'>No records found for customer <strong>" . htmlspecialchars($customer) . "</strong>.</p>";
    }

    db2_close($conn);
}
?>

</body>
</html>


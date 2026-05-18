import fs from 'fs';
import path from 'path';

const USERS_COUNT = 100000;
const ORDERS_COUNT = 1000000;

const usersFile = path.join(process.cwd(), 'users.csv');
const ordersFile = path.join(process.cwd(), 'orders.csv');

console.log('Generating users.csv...');
const usersStream = fs.createWriteStream(usersFile);
usersStream.write('user_id,name,country,signup_date\n');

const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Brazil', 'Mexico'];

for (let i = 1; i <= USERS_COUNT; i++) {
  const name = `User_${i}`;
  const country = countries[Math.floor(Math.random() * countries.length)];
  // Random date in 2023
  const date = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  const dateString = date.toISOString().split('T')[0];
  
  usersStream.write(`${i},${name},${country},${dateString}\n`);
}
usersStream.end();
console.log(`✅ Created ${USERS_COUNT} users in users.csv.`);

console.log('Generating orders.csv (this might take a few seconds)...');
const ordersStream = fs.createWriteStream(ordersFile);
ordersStream.write('order_id,user_id,amount,status,order_date\n');

const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'CANCELLED'];

// Use stream draining to prevent memory issues with 1M rows
function writeOrders() {
  let i = 1;
  function write() {
    let ok = true;
    do {
      const user_id = Math.floor(Math.random() * USERS_COUNT) + 1;
      const amount = (Math.random() * 500 + 10).toFixed(2);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const dateString = date.toISOString().split('T')[0];
      
      const row = `${i},${user_id},${amount},${status},${dateString}\n`;
      if (i === ORDERS_COUNT) {
        ordersStream.write(row);
        ordersStream.end();
        console.log(`✅ Created ${ORDERS_COUNT} orders in orders.csv. Done!`);
      } else {
        ok = ordersStream.write(row);
      }
      i++;
    } while (i <= ORDERS_COUNT && ok);
    
    if (i <= ORDERS_COUNT) {
      ordersStream.once('drain', write);
    }
  }
  write();
}

ordersStream.on('open', writeOrders);

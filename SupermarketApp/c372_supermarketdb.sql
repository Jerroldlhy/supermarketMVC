UPDATE orders
SET delivery_method = 'pickup',
    delivery_fee = 0.00
WHERE delivery_method IS NULL OR delivery_method = '';
orders
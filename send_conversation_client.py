import json
from langgraph_sdk import get_client

# Replace this with the URL of your own deployed graph
URL = "http://localhost:8123"
client = get_client(url=URL)

# Search all hosted graphs
assistants = await client.assistants.search()

thread = await client.threads.create()
print(thread['thread_id'])
input_dict = {"messages": [
      {
        "content": "the whole conversation transcript here with speaker and message",
        "additional_kwargs": {},
        "response_metadata": {},
        "type": "human",
        "name": None,
        "id": "5cf87a75-3f74-44eb-964d-b3851a5d08ed",
        "example": False
      }
    ]
    }

async for chunk in client.runs.stream(
    thread["thread_id"],
    assistant_id="designer_agent",
    input=input_dict,
    stream_mode="updates",):
    #    continue
    
    print(f"Receiving new event of type: {chunk.event}...")
    print(json.dumps(chunk.data, indent=4))
    print("\n\n")

await client.threads.update_state(
    thread['thread_id'], 
    {"is_finished": True}, 
    as_node="interview_user"
    )

async for chunk in client.runs.stream(
    #thread_id=current_state['checkpoint']['thread_id'],
    #checkpoint_id=current_state['checkpoint']['checkpoint_id'],
    thread_id=thread['thread_id'],
    assistant_id="designer_agent",
    input=None,#{"human_confirmation_message": "yes"},
    stream_mode="updates",):
    #    continue
    
    print(f"Receiving new event of type: {chunk.event}...")
    print(json.dumps(chunk.data, indent=4))
    print("\n\n")



current_state = await client.threads.get_state(thread['thread_id'])
#current_state.keys()
#dict_keys(['values', 'next', 'tasks', 'metadata', 'created_at', 'checkpoint', 'parent_checkpoint', 'checkpoint_id', 'parent_checkpoint_id'])
#current_state['values'].keys()
#dict_keys(['messages', 'is_finished', 'erp_design'])
current_state['values']['erp_design']
"""{'modules': [{'name': 'Inventory Management',
   'utility_description': 'Manage and track inventory levels, orders, sales, and deliveries.',
   'usage_description': 'Used to maintain optimal inventory levels, track stock movements, and manage reordering processes.',
   'tables_and_columns': ['InventoryItems: { id, name, quantity, location, reorder_level }',
    'Suppliers: { id, name, contact_info }',
    'Orders: { id, item_id, quantity, order_date, status }'],
   'key_features_and_actions': ['Track inventory levels in real-time',
    'Automate reorder notifications',
    'Generate inventory reports',
    'Manage supplier information']},
  {'name': 'Sales Management',
   'utility_description': 'Handle sales processes from order creation to invoicing.',
   'usage_description': 'Used by sales teams to create quotes, process orders, and manage customer relationships.',
   'tables_and_columns': ['SalesOrders: { id, customer_id, order_date, total_amount, status }',
    'Customers: { id, name, contac
    ...
    """
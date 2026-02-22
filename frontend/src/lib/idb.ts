import { openDB } from "idb";
import  type{ Task} from "@/types/task";
import  type{QueueJob } from "@/types/queue";


const DB_NAME = "MyTodoApp";
const DB_VERSION = 4;

const STORE_TASKS = "tasks";
const STORE_USER = "user";
const STORE_SYNC = "syncQueue";

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {

      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_USER)) {
        db.createObjectStore(STORE_USER, { keyPath: "email" });
      }

      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        const store = db.createObjectStore(STORE_SYNC, { keyPath: "id" });
        store.createIndex("byRetry", "retry");
      }
    }
  });
}


export const addTask = async (task :Partial<Task>): Promise<void>  => {
  if (!task?.id) return;

  const db = await initDB();
  const existing = await db.get(STORE_TASKS, task.id);

  const mergedTask = {
    ...existing,
    ...task,

    // workspace default safety
    workspaceType:
      task.workspaceType ??
      existing?.workspaceType ??
      "personal",

    // preserve image
    image:
      task.image !== undefined
        ? task.image
        : existing?.image
  };

  await db.put(STORE_TASKS, mergedTask);
};




//userEmail and workspace
export const getAllTasks = async (
  userEmail: string,
  workspaceType: string
): Promise<Task[]> => {

  if (!userEmail) return [];

  const db = await initDB();
  const allTasks = await db.getAll(STORE_TASKS);

  return allTasks.filter(t =>
    t.userEmail === userEmail &&
    (t.workspaceType || "personal") === workspaceType &&
    !t.deleted
  );
};






export const saveUser =  async (userData: { email: string; name: string }): Promise<void> => {
  const db = await initDB();
  await db.put(STORE_USER, userData); 
};

export const getUser = async (
  email: string
): Promise<{ email: string; name: string } | null> => {
  if (!email) return null; //Never call IDB with undefined key.
  const db = await initDB();
  return db.get(STORE_USER, email);
};


//o(1)
export async function getTaskById(id: string): Promise<Task | null> {

  if (!id) return null;  
  const db = await initDB();
  return db.get('tasks', id);
}


export const deleteTaskFromIDB = async (
  id: string
): Promise<void> => {
  if (!id) return;  
  const db = await initDB();
  const tx = db.transaction(STORE_TASKS, 'readwrite');
  tx.store.delete(id);
  await tx.done;
  console.log('IDB DELETE COMMITTED:', id);
};




//queue helpet functions
export async function addToQueue(item: QueueJob): Promise<void> {
  const db = await initDB();
  await db.put("syncQueue", item);
}


export async function getQueue(){
 const db = await initDB();
 return db.getAll('syncQueue');
}

export async function removeFromQueue(
  id: string
): Promise<void> {
 const db = await initDB();
 return db.delete('syncQueue', id);
}

export async function updateQueue(
  item: QueueJob
): Promise<void> {
  const db = await initDB();
  await db.put(STORE_SYNC, item);
}


export async function clearAllUserData() {
  const db = await initDB();
  await db.clear("tasks");
  await db.clear("syncQueue");
  await db.clear("user");
}

//to reduce server call--->if checkbox multiple times toggle ho on offline,,so sbh call server pr na jaayein
/*
agar user:

edit text
then complete toggle
then archive


payload change hota.

Old job replace ho raha but payload merge nahi.

Better:
always keep latest payload only.
 */
export async function upsertQueue(job: QueueJob): Promise<void> {
 const db = await initDB();
 const all = await db.getAll("syncQueue");

 const existing = all.find(
  j => j.taskId === job.taskId && j.action==="update"
 );

 if(existing){
   job.id = existing.id;
   job.retry = existing.retry || 0;
 }

 job.nextRetry = Date.now();
 await db.put("syncQueue", job);
}



//Delete aaye to:---->old updates remove.
export async function removeTaskUpdatesFromQueue(taskId: string): Promise<void> {
 const db = await initDB();
 const all = await db.getAll("syncQueue");

 for(const j of all){
   if(j.taskId===taskId && j.action==="update"){
     await db.delete("syncQueue", j.id);
   }
 }
}


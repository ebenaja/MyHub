
import {
  createTask,
  getTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "./taskService";

export async function testTaskCRUD(): Promise<void> {
  const testTitle = `MyHub SQLite Test ${Date.now()}`;
  let testTaskId: number | null = null;

  try {
    // 1. CREATE
    await createTask(testTitle, "Testing");

    // 2. READ
    let tasks = await getTasks();
    const createdTask = tasks.find(
      (task) => task.title === testTitle
    );

    if (!createdTask) {
      throw new Error("CREATE atau READ gagal.");
    }

    testTaskId = createdTask.id;
    console.log("CREATE dan READ berhasil.");

    // 3. UPDATE STATUS
    await updateTaskStatus(testTaskId, true);

    tasks = await getTasks();
    const completedTask = tasks.find(
      (task) => task.id === testTaskId
    );

    if (completedTask?.completed !== 1) {
      throw new Error("UPDATE STATUS gagal.");
    }

    console.log("UPDATE STATUS berhasil.");

    // 4. UPDATE DETAIL
    await updateTask(
      testTaskId,
      `${testTitle} Updated`,
      "Testing",
      "high"
    );

    tasks = await getTasks();
    const updatedTask = tasks.find(
      (task) => task.id === testTaskId
    );

    if (
      updatedTask?.title !== `${testTitle} Updated` ||
      updatedTask?.priority !== "high"
    ) {
      throw new Error("UPDATE DETAIL gagal.");
    }

    console.log("UPDATE DETAIL berhasil.");

    // 5. DELETE
    await deleteTask(testTaskId);
    testTaskId = null;

    tasks = await getTasks();

    if (tasks.some((task) => task.title === `${testTitle} Updated`)) {
      throw new Error("DELETE gagal.");
    }

    console.log("DELETE berhasil.");
    console.log("SEMUA PENGUJIAN SQLITE BERHASIL.");
  } finally {
    // Bersihkan data percobaan jika pengujian gagal.
    if (testTaskId !== null) {
      await deleteTask(testTaskId);
    }
  }
}

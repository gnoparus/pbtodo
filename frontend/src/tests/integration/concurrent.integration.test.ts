import { describe, it, expect, beforeEach } from 'vitest'
import { testPb, userManager, dataManager } from './setup'

describe('Concurrent Operations Integration Tests', () => {
  beforeEach(async () => {
    await userManager.loginTestUser()
  })

  describe('Concurrent Todo Creation', () => {
    it('should handle multiple concurrent todo creation', async () => {
      const userId = userManager.getTestId()
      const promises = []

      // Create 10 todos concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          testPb.collection('todos').create({
            title: `Concurrent Todo ${i}`,
            user: userId,
            completed: false,
            priority: 'medium',
          })
        )
      }

      const results = await Promise.all(promises)

      // Verify all todos were created successfully
      expect(results).toHaveLength(10)
      results.forEach((todo, index) => {
        expect(todo.title).toBe(`Concurrent Todo ${index}`)
        expect(todo.user).toBe(userId)
        dataManager.recordCreatedId(todo.id)
      })

      // Verify todos exist in database
      const allTodos = await testPb.collection('todos').getFullList()
      const createdTodos = allTodos.filter(todo =>
        todo.title.startsWith('Concurrent Todo')
      )
      expect(createdTodos).toHaveLength(10)
    })

    it('should handle high volume concurrent operations', async () => {
      const userId = userManager.getTestId()
      const batchSize = 50
      const promises = []

      // Create 50 todos concurrently
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          testPb.collection('todos').create({
            title: `High Volume Todo ${i}`,
            user: userId,
            completed: i % 2 === 0, // Alternate completion status
            priority: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high',
          })
        )
      }

      const startTime = Date.now()
      const results = await Promise.allSettled(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // Check performance - should complete within reasonable time
      expect(duration).toBeLessThan(15000) // 15 seconds

      // Verify most operations succeeded (allowing for some failures under load)
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(batchSize * 0.8) // At least 80% success rate

      // Clean up successful todos
      for (const result of results) {
        if (result.status === 'fulfilled') {
          dataManager.recordCreatedId(result.value.id)
        }
      }

      // Verify data integrity
      const allTodos = await testPb.collection('todos').getFullList()
      const createdTodos = allTodos.filter(todo =>
        todo.title.startsWith('High Volume Todo')
      )
      expect(createdTodos.length).toBe(successful.length)
    })
  })

  describe('Concurrent Updates', () => {
    it('should handle concurrent updates to same todo', async () => {
      const userId = userManager.getTestId()

      // Create a todo
      const todo = await testPb.collection('todos').create({
        title: 'Original Title',
        user: userId,
        completed: false,
        priority: 'medium',
      })
      dataManager.recordCreatedId(todo.id)

      // Perform multiple updates concurrently
      const updatePromises = [
        testPb.collection('todos').update(todo.id, { title: 'Update 1' }),
        testPb.collection('todos').update(todo.id, { title: 'Update 2' }),
        testPb.collection('todos').update(todo.id, { title: 'Update 3' }),
        testPb.collection('todos').update(todo.id, { completed: true }),
        testPb.collection('todos').update(todo.id, { priority: 'high' }),
      ]

      const results = await Promise.allSettled(updatePromises)

      // At least one update should succeed
      const successfulUpdates = results.filter(r => r.status === 'fulfilled')
      expect(successfulUpdates.length).toBeGreaterThan(0)

      // Final state should be consistent
      const finalTodo = await testPb.collection('todos').getOne(todo.id)
      expect(['Update 1', 'Update 2', 'Update 3', 'Original Title']).toContain(finalTodo.title)
      expect([true, false]).toContain(finalTodo.completed)
      expect(['medium', 'high']).toContain(finalTodo.priority)
    })

    it('should handle concurrent updates to different todos', async () => {
      const userId = userManager.getTestId()
      const todoCount = 20
      const todos = []

      // Create multiple todos
      for (let i = 0; i < todoCount; i++) {
        const todo = await testPb.collection('todos').create({
          title: `Todo ${i}`,
          user: userId,
          completed: false,
          priority: 'medium',
        })
        todos.push(todo)
        dataManager.recordCreatedId(todo.id)
      }

      // Update all todos concurrently
      const updatePromises = todos.map((todo, index) =>
        testPb.collection('todos').update(todo.id, {
          title: `Updated Todo ${index}`,
          completed: true,
          priority: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high',
        })
      )

      const results = await Promise.all(updatePromises)

      // Verify all updates succeeded
      expect(results).toHaveLength(todoCount)
      results.forEach((result, index) => {
        expect(result.title).toBe(`Updated Todo ${index}`)
        expect(result.completed).toBe(true)
        expect(['low', 'medium', 'high']).toContain(result.priority)
      })
    })
  })

  describe('Concurrent Mixed Operations', () => {
    it('should handle concurrent create, read, update, delete operations', async () => {
      const userId = userManager.getTestId()
      const operationCount = 30
      const promises = []

      // Create initial todos to work with
      const initialTodos = []
      for (let i = 0; i < 10; i++) {
        const todo = await testPb.collection('todos').create({
          title: `Initial Todo ${i}`,
          user: userId,
          completed: false,
          priority: 'medium',
        })
        initialTodos.push(todo)
        dataManager.recordCreatedId(todo.id)
      }

      // Mix of concurrent operations
      for (let i = 0; i < operationCount; i++) {
        const operation = i % 4

        switch (operation) {
          case 0: // Create
            promises.push(
              testPb.collection('todos').create({
                title: `Concurrent Create ${i}`,
                user: userId,
                completed: false,
                priority: 'low',
              }).then(todo => {
                dataManager.recordCreatedId(todo.id)
                return todo
              })
            )
            break

          case 1: // Read
            if (initialTodos.length > 0) {
              const todoId = initialTodos[i % initialTodos.length].id
              promises.push(testPb.collection('todos').getOne(todoId))
            }
            break

          case 2: // Update
            if (initialTodos.length > 0) {
              const todoId = initialTodos[i % initialTodos.length].id
              promises.push(
                testPb.collection('todos').update(todoId, {
                  title: `Concurrent Update ${i}`,
                  completed: i % 2 === 0,
                })
              )
            }
            break

          case 3: // Read All
            promises.push(testPb.collection('todos').getFullList())
            break
        }
      }

      const results = await Promise.allSettled(promises)

      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(operationCount * 0.8)

      // Verify final state consistency
      const finalTodos = await testPb.collection('todos').getFullList()
      expect(finalTodos).toBeInstanceOf(Array)
      expect(finalTodos.length).toBeGreaterThanOrEqual(initialTodos.length)
    })
  })

  describe('Concurrent Authentication', () => {
    it('should handle concurrent authentication operations', async () => {
      const promises = []

      // Test concurrent logins (should succeed)
      for (let i = 0; i < 5; i++) {
        promises.push(
          testPb.collection('users').authWithPassword(
            'test@example.com',
            'testpassword123'
          )
        )
      }

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.record).toBeDefined()
        expect(result.token).toBeDefined()
      })
    })

    it('should handle concurrent user creation', async () => {
      const promises = []

      // Create multiple users concurrently
      for (let i = 0; i < 3; i++) {
        const email = `concurrent${i}_${Date.now()}@example.com`
        promises.push(
          testPb.collection('users').create({
            email,
            password: 'testpassword123',
            passwordConfirm: 'testpassword123',
            name: `Concurrent User ${i}`,
          })
        )
      }

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach((result, index) => {
        expect(result.id).toBeDefined()
        expect(result.name).toBe(`Concurrent User ${index}`)
      })

      // Clean up created users
      for (const result of results) {
        try {
          await testPb.collection('users').delete(result.id)
        } catch (error) {
          // User deletion might fail due to constraints, which is okay
          console.warn('Failed to cleanup user:', result.id, error)
        }
      }
    })
  })

  describe('Stress Testing', () => {
    it('should handle sustained concurrent load', async () => {
      const userId = userManager.getTestId()
      const rounds = 3
      const operationsPerRound = 20

      for (let round = 0; round < rounds; round++) {
        const promises = []

        // Create todos
        for (let i = 0; i < operationsPerRound; i++) {
          promises.push(
            testPb.collection('todos').create({
              title: `Stress Test Round ${round} Todo ${i}`,
              user: userId,
              completed: false,
              priority: 'medium',
            }).then(todo => {
              dataManager.recordCreatedId(todo.id)
              return todo
            })
          )
        }

        const startTime = Date.now()
        const results = await Promise.allSettled(promises)
        const endTime = Date.now()
        const duration = endTime - startTime

        // Performance should remain reasonable
        expect(duration).toBeLessThan(10000) // 10 seconds per round

        // Success rate should be high
        const successful = results.filter(r => r.status === 'fulfilled')
        expect(successful.length).toBeGreaterThan(operationsPerRound * 0.9)

        console.log(`Round ${round + 1}/${rounds}: ${successful.length}/${operationsPerRound} operations in ${duration}ms`)
      }

      // Verify all data is consistent
      const allTodos = await testPb.collection('todos').getFullList()
      const stressTodos = allTodos.filter(todo =>
        todo.title.includes('Stress Test')
      )
      expect(stressTodos.length).toBeGreaterThan(0)
    })
  })
})

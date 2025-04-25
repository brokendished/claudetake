    } else {
      setFilteredQuotes(quotes)
    }
  }, [searchTerm, quotes])

  if (status !== 'authenticated') {
    return <p className="p-4">Loading your session…</p>
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Quotes</h1>

      <input
        type="text"
        placeholder="Search by keyword..."
        className="w-full border p-2 mb-4 rounded shadow-sm text-sm"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <p className="text-gray-500">No quotes found.</p>
        ) : (
          filteredQuotes.map(q => (
            <div key={q.id} className="border rounded-lg p-4 shadow bg-white">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800">
                  {q.issue || 'Quote Request'}
                </h2>
                <span className="text-sm text-gray-500">
                  {q.createdAt.toLocaleDateString()}
                </span>
              </div>

              {q.images?.[0] && (
                <img
                  src={q.images[0]}
                  alt="Snapshot"
                  className="mt-2 max-w-xs rounded border"
                />
              )}

              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {q.aiReply || 'No summary available.'}
              </p>

              <details className="mt-2 text-sm text-blue-600 cursor-pointer">
                <summary>View Full Conversation</summary>
                <div className="bg-gray-50 mt-2 p-2 rounded border text-gray-600 text-xs">
                  {q.chatTranscript?.map((m, i) => (
                    <div key={i} className="mb-1">
                      <strong>{m.role}:</strong> {m.content}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

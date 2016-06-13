	function CPromise(fn)
	{
		if (typeof fn !== "function") throw(new(TypeError("Illegal argument")));
		this.state = "pending";
		this.__onresolve = [];
		try
		{
			fn(CPromise.resolve.bind(this), CPromise.reject.bind(this));
		}
		catch(ex)
		{
			CPromise.reject.call(this, ex.message);
		}
	}
	
	(function()
	{
		this.then = function(fn_a, fn_b)
		{
			var self = this;
			var p = new CPromise(function() {if (self.state === "fulfilled") fn_a(self.value); else if (self.state === "rejected") fn_b(self.reason); } );
			if (this.state === "pending")
			{
				p._then = []; p._then[true] = fn_a; p._then[false] = fn_b;
				CPromise.resolve.call(p, this);
			}
			return(p);
		};
		
		this.catch = function(fn_b) { return( this.then(undefined, fn_b) ); };
		
	}).call(CPromise.prototype);
	
	(function()
	{
		var self = this;
		
		function statechange(state, res)
		{
			if (this.state === "pending")
			{
				if (this._then)
				{
					var f = this._then[state];
					if (f)
						try { f(res); }
						catch(ex) { state = false; res = ex.message; }
				}
				if (state) { this.state = "fulfilled"; this.value = res; }
				else { this.state = "rejected"; this.reason = res;}
				this.__onresolve.forEach( function(e) { self.resolve.call(e, this); }, this );
			}
		}
		
		this.resolve = function(resolveable)
		{
			if (this instanceof CPromise)
			{
				if (resolveable instanceof CPromise)
				{
					if (this === resolveable) throw(new TypeError("a CPromise can't resolve itself"));
					if (this.state === "pending")
					{
						if (resolveable.state !== "pending")
						{
							statechange.call(this, resolveable.state === "fulfilled", resolveable.state === "fulfilled" ? resolveable.value : resolveable.reason);
						} else resolveable.__onresolve.push(this); // install transition listener
					}
				}
				else
				{
					var t = typeof resolveable;					
					if ((t === "object" || t === "function") && resolveable.then)
					{					
						if (typeof t.then === "function")
						{
							try { resolveable.then.call(resolveable, self.resolve.bind(this), self.reject.bind(this)) ;}
							catch (ex) { self.reject.call(this, ex.message); }
						}
						else statechange.call(this, true, resolveable.then);
					}
					else
					{
						statechange.call(this, true, resolveable);
					}
				}
			}
			else return(new CPromise( function(a) { a(resolveable) }));
		};
		
		this.reject = function(reason)
		{
			if (this instanceof CPromise) statechange.call(this, false, reason);
			else return(new CPromise(function(a,b) { b(reason); }));
		};
		
		this.all = function(iterables)
		{
			if (iterables && typeof iterables.forEach === "function")
			{
				return(new CPromise(function(a,b)
							{
								var c = 0, len = iterables.length, res = [];
								if (len > 0)
									try
									{
										iterables.forEach(
											function (e) { 
												CPromise.resolve(e).then(
													function(v) { res.push(v); c++; if (c === len) a(res); }, 
													function(v) { res = [v]; b(v); throw(""); }
												)}
										);
									} catch(ex) { }
								else a(res);
							}
				));
			}
		};
		
		this.race = function(iterables)
		{
			if (iterables && typeof iterables.forEach === "function")
			{
				return(new CPromise(function(a,b)
							{
								var c = 1;
								try
								{
									iterables.forEach(
										function (e) { 
											CPromise.resolve(e).then( 
												function(v) { if (c) { c--;  a(v); throw("");} }, 
												function(v) { if (c) { c--;  b(v); throw("");} }
											)}
									);
								} catch(ex) { }
							}
				));
			}
		};		
	}).call(CPromise);

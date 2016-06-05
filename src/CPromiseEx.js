	function CPromiseEx(fex)
	{
		"use strict;"
		
		var self = this;
		var _onresolve, _onreject, _onresolve2, _onreject2;
		var _args = [];
		
		var exec = function(f, args, res, rej, saveargs) 
		{ 
			if (saveargs) _args = args;
			if (f) 
			{ 
				try 
				{ 
					f.apply(self, args); 
				} 
				catch(e) 
				{ 
					if (rej) rej.call(self, e); 
					return; 
				} 
				if (res) res.apply(self, args); 
			}
		};
		
		var reject = function()
		{
			self.state = "rejected";
			exec(_onreject, Array.prototype.slice.call(arguments,0), _onresolve2, _onreject2, true);
		};

		var resolve = function()
		{
			self.state="fulfilled";
			exec(_onresolve, Array.prototype.slice.call(arguments,0), _onresolve2, _onreject2, true);
		};
		
		this.then = function(onresolve, onreject)
		{
			var r = new CPromiseEx(function(a,b) { _onresolve2 = a; _onreject2 = b; });
			
			if ( onresolve && typeof onresolve !== "function")
				throw("onresolve must be either a valid function or undefined");
			if ( onreject && typeof onreject !== "function")
				throw("onreject must be either a valid function or undefined");

			_onresolve = onresolve; _onreject = onreject;
			if (self.state !== "pending")
			{
				if (self.state === "rejected") reject.apply(this,_args); else resolve.apply(this,_args);
			}
			return(r);
		}
		
		this.catch = function(onreject)
		{
			return(self.then(undefined, onreject));
		};

		if (typeof fex !== "function")
			throw("The parameter provided must be a valid function");
		
		this.state = "pending";
		exec(fex, [resolve, reject], undefined, reject);
	}
	
	(function()
	{
		this.resolve = function(value)
		{
			if (value && typeof value.then === "function")
				return(new CPromiseEx(value.then));
			else return(new CPromiseEx(function(a,b) { a(value); }));
		};
		
		this.all = function(iterables)
		{
			if (iterables && typeof iterables.forEach === "function")
			{
				return(new CPromiseEx(function(a,b)
							{
								var c = 0, len = iterables.length;
								try
								{
									iterables.forEach(
										function (e) { 
											CPromiseEx.resolve(e).then( 
												function(v) { c++; if (c === len) a(v); }, 
												function(v) { b(v); throw(""); }
											)}
									);
								} catch(ex) { }
							}
				));
			}
		};
		
		this.race = function(iterables)
		{
			if (iterables && typeof iterables.forEach === "function")
			{
				return(new CPromiseEx(function(a,b)
							{
								var c = 2, len = iterables.length-1;
								try
								{
									iterables.forEach(
										function (e) { 
											CPromiseEx.resolve(e).then( 
												function(v) { c--; if (c) { a(v); throw("");} }, 
												function(v) { c--; if (c) { b(v); throw("");} }
											)}
									);
								} catch(ex) { }
							}
				));
			}
		};
	
	}).call(CPromiseEx);
